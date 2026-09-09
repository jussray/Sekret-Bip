import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
export const DESIRED_BUILD_COMMAND = '';
export const DESIRED_DEPLOY_COMMAND = 'npm run deploy:api:production';
export const DEFAULT_EVIDENCE_PATH = 'artifacts/cloudflare-workers-build-trigger.json';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSha(value) {
  const sha = clean(value).toLowerCase();
  return SHA_PATTERN.test(sha) ? sha : null;
}

function normalizeBranches(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(clean).filter(Boolean))];
}

function normalizePaths(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(clean).filter(Boolean))];
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function tokenCandidatesFromEnv(env) {
  const candidates = [
    {
      source: 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN',
      token: clean(env.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN),
    },
    {
      source: 'CLOUDFLARE_API_TOKEN',
      token: clean(env.CLOUDFLARE_API_TOKEN),
    },
  ].filter((candidate) => candidate.token);

  return candidates.filter(
    (candidate, index) => candidates.findIndex((other) => other.token === candidate.token) === index,
  );
}

export function configFromEnv(env = process.env) {
  const tokenCandidates = tokenCandidatesFromEnv(env);
  const reconcileBuildCommand = Object.prototype.hasOwnProperty.call(env, 'BIP_WORKER_BUILD_COMMAND');
  return {
    token: tokenCandidates[0]?.token ?? '',
    tokenCandidates,
    tokenSource: null,
    accountId: clean(env.CLOUDFLARE_ACCOUNT_ID),
    workerName: clean(env.BIP_WORKER_NAME) || 'sekret-backend',
    reconcileBuildCommand,
    desiredBuildCommand: reconcileBuildCommand ? clean(env.BIP_WORKER_BUILD_COMMAND) : null,
    desiredDeployCommand: clean(env.BIP_WORKER_DEPLOY_COMMAND) || DESIRED_DEPLOY_COMMAND,
    targetCommitSha: normalizeSha(env.BIP_WORKER_BUILD_COMMIT || env.GITHUB_SHA),
    evidencePath: clean(env.CLOUDFLARE_BUILD_EVIDENCE_PATH) || DEFAULT_EVIDENCE_PATH,
  };
}

function errorText(payload, fallback) {
  const messages = payload?.errors
    ?.map((error) => {
      const code = error?.code === undefined ? '' : `code=${error.code} `;
      return `${code}${error?.message || ''}`.trim();
    })
    .filter(Boolean);
  return messages?.length ? messages.join('; ') : fallback;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function cfRequest(config, requestPath, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_BASE}${requestPath}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(
      `Cloudflare ${options.method || 'GET'} ${requestPath} failed: ${errorText(payload, response.statusText)}`,
    );
  }
  return payload;
}

async function verifyUserScopedToken(config, fetchImpl) {
  const payload = await cfRequest(config, '/user/tokens/verify', {}, fetchImpl);
  if (payload?.result?.status !== 'active') {
    throw new Error('CLOUDFLARE_WORKERS_BUILDS_API_TOKEN_NOT_ACTIVE_OR_NOT_USER_SCOPED.');
  }
  return payload.result;
}

function canFallbackFromVerifyFailure(error) {
  return /Cloudflare GET \/user\/tokens\/verify failed:.*\bcode=6003\b/i.test(errorMessage(error));
}

async function proveWorkersBuildsReadCapability(config, fetchImpl) {
  const worker = await discoverWorker(config, fetchImpl);
  await listTriggers(config, worker.tag, fetchImpl);
  return worker;
}

async function selectActiveUserScopedToken(config, fetchImpl) {
  const candidates = config.tokenCandidates?.length
    ? config.tokenCandidates
    : config.token
      ? [{ source: 'configured-token', token: config.token }]
      : [];
  const failures = [];

  for (const candidate of candidates) {
    const candidateConfig = {
      ...config,
      token: candidate.token,
      tokenSource: candidate.source,
    };
    try {
      await verifyUserScopedToken(candidateConfig, fetchImpl);
      return candidateConfig;
    } catch (verifyError) {
      if (!canFallbackFromVerifyFailure(verifyError)) {
        failures.push(`${candidate.source}: ${errorMessage(verifyError)}`);
        continue;
      }

      try {
        await proveWorkersBuildsReadCapability(candidateConfig, fetchImpl);
        return candidateConfig;
      } catch (capabilityError) {
        failures.push(`${candidate.source}: ${errorMessage(capabilityError)}`);
      }
    }
  }

  throw new Error(
    `CLOUDFLARE_WORKERS_BUILDS_TOKEN_SELECTION_FAILED: ${failures.join('; ') || 'no token candidates configured'}`,
  );
}

export function selectWorkerScript(scripts, workerName) {
  const matches = (Array.isArray(scripts) ? scripts : [])
    .filter((script) => clean(script?.id) === workerName);
  if (matches.length !== 1) {
    throw new Error(`WORKER_SELECTION_FAILED: expected one ${workerName} Worker, found ${matches.length}.`);
  }

  const worker = matches[0];
  const tag = clean(worker?.tag);
  if (!tag) {
    throw new Error(`WORKER_TAG_MISSING: ${workerName} does not expose an immutable Cloudflare script tag.`);
  }
  return { name: workerName, tag };
}

function explicitlyIncludesMain(trigger) {
  const includes = normalizeBranches(trigger?.branch_includes);
  const excludes = normalizeBranches(trigger?.branch_excludes);
  return includes.includes('main') && !excludes.includes('main') && !excludes.includes('*');
}

export function isMainOnlyProductionTrigger(trigger) {
  return sameStrings(normalizeBranches(trigger?.branch_includes), ['main'])
    && normalizeBranches(trigger?.branch_excludes).length === 0;
}

export function selectProductionTrigger(triggers) {
  const candidates = (Array.isArray(triggers) ? triggers : [])
    .filter((trigger) => !trigger?.deleted_on && explicitlyIncludesMain(trigger));

  if (candidates.length !== 1) {
    throw new Error(
      `PRODUCTION_TRIGGER_SELECTION_FAILED: expected one explicit main trigger, found ${candidates.length}.`,
    );
  }

  const trigger = candidates[0];
  const triggerUuid = clean(trigger?.trigger_uuid);
  if (!triggerUuid) throw new Error('PRODUCTION_TRIGGER_UUID_MISSING.');
  return trigger;
}

export function selectPreviewTrigger(triggers, productionTrigger) {
  const productionUuid = clean(productionTrigger?.trigger_uuid);
  const candidates = (Array.isArray(triggers) ? triggers : [])
    .filter((trigger) => !trigger?.deleted_on && clean(trigger?.trigger_uuid) !== productionUuid);

  if (candidates.length > 1) {
    throw new Error(
      `NON_PRODUCTION_TRIGGER_SELECTION_FAILED: expected at most one active preview trigger, found ${candidates.length}.`,
    );
  }
  const preview = candidates[0] ?? null;
  if (preview && !clean(preview?.trigger_uuid)) {
    throw new Error('NON_PRODUCTION_TRIGGER_UUID_MISSING.');
  }
  return preview;
}

export function buildTriggerPlan(
  trigger,
  previewTrigger = null,
  desiredDeployCommand = DESIRED_DEPLOY_COMMAND,
  desiredBuildCommand = null,
  reconcileBuildCommand = desiredBuildCommand !== null,
) {
  const previousBuildCommand = clean(trigger?.build_command);
  const previousDeployCommand = clean(trigger?.deploy_command);
  const previousBranchIncludes = normalizeBranches(trigger?.branch_includes);
  const previousBranchExcludes = normalizeBranches(trigger?.branch_excludes);
  const previousPathIncludes = normalizePaths(trigger?.path_includes);
  const previousPathExcludes = normalizePaths(trigger?.path_excludes);
  const desiredBranchIncludes = ['main'];
  const desiredBranchExcludes = [];
  const desiredBuild = reconcileBuildCommand ? clean(desiredBuildCommand) : null;
  const desiredDeploy = clean(desiredDeployCommand);
  if (!desiredDeploy) throw new Error('DESIRED_DEPLOY_COMMAND_MISSING.');

  const patch = {};
  if (!sameStrings(previousBranchIncludes, desiredBranchIncludes)) {
    patch.branch_includes = desiredBranchIncludes;
  }
  if (!sameStrings(previousBranchExcludes, desiredBranchExcludes)) {
    patch.branch_excludes = desiredBranchExcludes;
  }
  if (reconcileBuildCommand && previousBuildCommand !== desiredBuild) patch.build_command = desiredBuild;
  if (previousDeployCommand !== desiredDeploy) patch.deploy_command = desiredDeploy;

  const nonProductionTrigger = previewTrigger
    ? {
        triggerUuid: clean(previewTrigger?.trigger_uuid),
        triggerName: clean(previewTrigger?.trigger_name) || null,
        branchIncludes: normalizeBranches(previewTrigger?.branch_includes),
        branchExcludes: normalizeBranches(previewTrigger?.branch_excludes),
        pathIncludes: normalizePaths(previewTrigger?.path_includes),
        pathExcludes: normalizePaths(previewTrigger?.path_excludes),
      }
    : null;

  return {
    triggerUuid: clean(trigger?.trigger_uuid),
    triggerName: clean(trigger?.trigger_name) || null,
    branchIncludes: previousBranchIncludes,
    branchExcludes: previousBranchExcludes,
    pathIncludes: previousPathIncludes,
    pathExcludes: previousPathExcludes,
    desiredBranchIncludes,
    desiredBranchExcludes,
    previousBuildCommand: previousBuildCommand || null,
    previousDeployCommand: previousDeployCommand || null,
    reconcileBuildCommand,
    desiredBuildCommand: desiredBuild,
    desiredDeployCommand: desiredDeploy,
    watchPathsMode: 'observe-only',
    nonProductionTrigger,
    nonProductionBuildsEnabled: Boolean(nonProductionTrigger),
    changeRequired: Object.keys(patch).length > 0 || Boolean(nonProductionTrigger),
    productionPatchRequired: Object.keys(patch).length > 0,
    patch: Object.keys(patch).length > 0 ? patch : null,
  };
}

async function discoverWorker(config, fetchImpl) {
  const payload = await cfRequest(
    config,
    `/accounts/${config.accountId}/workers/scripts?per_page=100`,
    {},
    fetchImpl,
  );
  return selectWorkerScript(payload?.result, config.workerName);
}

async function listTriggers(config, workerTag, fetchImpl) {
  const payload = await cfRequest(
    config,
    `/accounts/${config.accountId}/builds/workers/${workerTag}/triggers`,
    {},
    fetchImpl,
  );
  return Array.isArray(payload?.result) ? payload.result : [];
}

async function patchTrigger(config, triggerUuid, patch, fetchImpl) {
  return cfRequest(
    config,
    `/accounts/${config.accountId}/builds/triggers/${triggerUuid}`,
    { method: 'PATCH', body: patch },
    fetchImpl,
  );
}

async function triggerExactBuild(config, triggerUuid, commitSha, fetchImpl) {
  const payload = await cfRequest(
    config,
    `/accounts/${config.accountId}/builds/triggers/${triggerUuid}/builds`,
    {
      method: 'POST',
      body: { branch: 'main', commit_hash: commitSha },
    },
    fetchImpl,
  );
  const buildUuid = clean(payload?.result?.build_uuid);
  if (!buildUuid) throw new Error('MANUAL_BUILD_UUID_MISSING.');
  return buildUuid;
}

async function writeEvidence(evidencePath, evidence) {
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

function initialEvidence(config, apply, now) {
  return {
    schemaVersion: 8,
    generatedAt: now().toISOString(),
    accountId: config.accountId || null,
    credential: {
      candidateSources: (config.tokenCandidates ?? []).map((candidate) => candidate.source),
      selectedSource: null,
    },
    worker: {
      name: config.workerName || null,
      tag: null,
    },
    productionTrigger: null,
    nonProductionTrigger: null,
    before: {
      branchIncludes: null,
      branchExcludes: null,
      pathIncludes: null,
      pathExcludes: null,
      buildCommand: null,
      deployCommand: null,
    },
    desired: {
      branchIncludes: ['main'],
      branchExcludes: [],
      buildCommand: config.reconcileBuildCommand ? config.desiredBuildCommand : null,
      deployCommand: config.desiredDeployCommand || null,
      watchPathsMode: 'observe-only',
      nonProductionBuildsEnabled: false,
    },
    targetBuild: {
      branch: 'main',
      commitSha: config.targetCommitSha,
      requested: false,
      buildUuid: null,
    },
    applyRequested: apply,
    applied: false,
    triggerVerified: false,
    verified: false,
    status: 'initializing',
    rollback: {
      attempted: false,
      succeeded: null,
      branchIncludes: null,
      branchExcludes: null,
      pathIncludes: null,
      pathExcludes: null,
      buildCommand: null,
      deployCommand: null,
    },
  };
}

async function failWithEvidence(config, evidence, status, error) {
  evidence.status = status;
  evidence.error = errorMessage(error);
  await writeEvidence(config.evidencePath, evidence);
  throw error;
}

async function verifyDesiredTrigger(config, workerTag, plan, fetchImpl) {
  const afterTriggers = await listTriggers(config, workerTag, fetchImpl);
  const afterTrigger = selectProductionTrigger(afterTriggers);
  const previewTrigger = selectPreviewTrigger(afterTriggers, afterTrigger);
  if (previewTrigger) {
    throw new Error(
      'NON_PRODUCTION_BRANCH_BUILDS_ENABLED: disable the active preview trigger before exact production reconciliation.',
    );
  }

  const observedBranchIncludes = normalizeBranches(afterTrigger?.branch_includes);
  const observedBranchExcludes = normalizeBranches(afterTrigger?.branch_excludes);
  const observedPathIncludes = normalizePaths(afterTrigger?.path_includes);
  const observedPathExcludes = normalizePaths(afterTrigger?.path_excludes);
  const observedBuildCommand = clean(afterTrigger?.build_command);
  const observedDeployCommand = clean(afterTrigger?.deploy_command);

  if (!sameStrings(observedBranchIncludes, plan.desiredBranchIncludes)
      || !sameStrings(observedBranchExcludes, plan.desiredBranchExcludes)) {
    throw new Error(
      `BRANCH_CONTROL_READBACK_MISMATCH: expected main-only production trigger; observed includes=${JSON.stringify(observedBranchIncludes)} excludes=${JSON.stringify(observedBranchExcludes)}.`,
    );
  }
  if (plan.reconcileBuildCommand && observedBuildCommand !== plan.desiredBuildCommand) {
    throw new Error(
      `BUILD_COMMAND_READBACK_MISMATCH: expected ${plan.desiredBuildCommand || '<empty>'}, observed ${observedBuildCommand || '<empty>'}.`,
    );
  }
  if (observedDeployCommand !== plan.desiredDeployCommand) {
    throw new Error(
      `DEPLOY_COMMAND_READBACK_MISMATCH: expected ${plan.desiredDeployCommand}, observed ${observedDeployCommand || 'missing'}.`,
    );
  }
  return {
    branchIncludes: observedBranchIncludes,
    branchExcludes: observedBranchExcludes,
    pathIncludes: observedPathIncludes,
    pathExcludes: observedPathExcludes,
    buildCommand: observedBuildCommand,
    deployCommand: observedDeployCommand,
    nonProductionBuildsEnabled: false,
  };
}

function rollbackPatch(plan) {
  const patch = {};
  if (plan.patch?.branch_includes !== undefined) patch.branch_includes = plan.branchIncludes;
  if (plan.patch?.branch_excludes !== undefined) patch.branch_excludes = plan.branchExcludes;
  if (plan.patch?.build_command !== undefined) patch.build_command = plan.previousBuildCommand ?? '';
  if (plan.patch?.deploy_command !== undefined) patch.deploy_command = plan.previousDeployCommand ?? '';
  return patch;
}

export async function reconcileWorkersBuildTrigger({
  env = process.env,
  apply = false,
  fetchImpl = fetch,
  now = () => new Date(),
} = {}) {
  const config = configFromEnv(env);
  const evidence = initialEvidence(config, apply, now);

  if (!config.tokenCandidates.length) {
    await failWithEvidence(
      config,
      evidence,
      'configuration-invalid',
      new Error('CLOUDFLARE_WORKERS_BUILDS_API_TOKEN or CLOUDFLARE_API_TOKEN is required.'),
    );
  }
  if (!config.accountId) {
    await failWithEvidence(
      config,
      evidence,
      'configuration-invalid',
      new Error('CLOUDFLARE_ACCOUNT_ID is required.'),
    );
  }
  if (apply && !config.targetCommitSha) {
    await failWithEvidence(
      config,
      evidence,
      'configuration-invalid',
      new Error('BIP_WORKER_BUILD_COMMIT or GITHUB_SHA must be an exact 40-character Git commit SHA when applying.'),
    );
  }

  let providerConfig;
  let worker;
  let plan;
  try {
    providerConfig = await selectActiveUserScopedToken(config, fetchImpl);
    evidence.credential.selectedSource = providerConfig.tokenSource;
    worker = await discoverWorker(providerConfig, fetchImpl);
    const triggers = await listTriggers(providerConfig, worker.tag, fetchImpl);
    const productionTrigger = selectProductionTrigger(triggers);
    const previewTrigger = selectPreviewTrigger(triggers, productionTrigger);
    plan = buildTriggerPlan(
      productionTrigger,
      previewTrigger,
      providerConfig.desiredDeployCommand,
      providerConfig.desiredBuildCommand,
      providerConfig.reconcileBuildCommand,
    );

    evidence.worker = worker;
    evidence.productionTrigger = {
      triggerUuid: plan.triggerUuid,
      triggerName: plan.triggerName,
      branchIncludes: plan.branchIncludes,
      branchExcludes: plan.branchExcludes,
      pathIncludes: plan.pathIncludes,
      pathExcludes: plan.pathExcludes,
    };
    evidence.nonProductionTrigger = plan.nonProductionTrigger;
    evidence.before = {
      branchIncludes: plan.branchIncludes,
      branchExcludes: plan.branchExcludes,
      pathIncludes: plan.pathIncludes,
      pathExcludes: plan.pathExcludes,
      buildCommand: plan.previousBuildCommand,
      deployCommand: plan.previousDeployCommand,
    };
    evidence.desired = {
      branchIncludes: plan.desiredBranchIncludes,
      branchExcludes: plan.desiredBranchExcludes,
      buildCommand: plan.reconcileBuildCommand ? plan.desiredBuildCommand : null,
      deployCommand: plan.desiredDeployCommand,
      watchPathsMode: plan.watchPathsMode,
      nonProductionBuildsEnabled: false,
    };
    evidence.rollback.branchIncludes = plan.branchIncludes;
    evidence.rollback.branchExcludes = plan.branchExcludes;
    evidence.rollback.pathIncludes = plan.pathIncludes;
    evidence.rollback.pathExcludes = plan.pathExcludes;
    evidence.rollback.buildCommand = plan.previousBuildCommand;
    evidence.rollback.deployCommand = plan.previousDeployCommand;
    evidence.status = plan.nonProductionBuildsEnabled
      ? 'non-production-builds-enabled'
      : plan.productionPatchRequired
        ? 'change-required'
        : 'already-correct';
  } catch (error) {
    await failWithEvidence(config, evidence, 'provider-discovery-failed', error);
  }

  if (!apply) {
    evidence.triggerVerified = !plan.changeRequired;
    evidence.verified = !plan.changeRequired;
    await writeEvidence(config.evidencePath, evidence);
    console.log('CLOUDFLARE_WORKERS_BUILD_TRIGGER_PLAN_WRITTEN');
    return evidence;
  }

  if (plan.nonProductionBuildsEnabled) {
    await failWithEvidence(
      config,
      evidence,
      'non-production-builds-enabled',
      new Error(
        'NON_PRODUCTION_BRANCH_BUILDS_ENABLED: disable Builds for non-production branches before applying the production trigger repair.',
      ),
    );
  }

  let mutationStarted = false;
  try {
    if (plan.productionPatchRequired) {
      mutationStarted = true;
      await patchTrigger(providerConfig, plan.triggerUuid, plan.patch, fetchImpl);
    }

    const observedTrigger = await verifyDesiredTrigger(
      providerConfig,
      worker.tag,
      plan,
      fetchImpl,
    );
    evidence.applied = plan.productionPatchRequired;
    evidence.triggerVerified = true;
    evidence.after = observedTrigger;
  } catch (error) {
    evidence.status = 'trigger-verification-failed';
    evidence.error = errorMessage(error);

    if (mutationStarted) {
      const patch = rollbackPatch(plan);
      if (Object.keys(patch).length > 0) {
        evidence.rollback.attempted = true;
        try {
          await patchTrigger(providerConfig, plan.triggerUuid, patch, fetchImpl);
          const rollbackTriggers = await listTriggers(providerConfig, worker.tag, fetchImpl);
          const rollbackTrigger = selectProductionTrigger(rollbackTriggers);
          const rollbackBranchIncludes = normalizeBranches(rollbackTrigger?.branch_includes);
          const rollbackBranchExcludes = normalizeBranches(rollbackTrigger?.branch_excludes);
          const rollbackBuildCommand = clean(rollbackTrigger?.build_command);
          const rollbackDeployCommand = clean(rollbackTrigger?.deploy_command);
          const branchesRestored = (
            (plan.patch?.branch_includes === undefined || sameStrings(rollbackBranchIncludes, plan.branchIncludes))
            && (plan.patch?.branch_excludes === undefined || sameStrings(rollbackBranchExcludes, plan.branchExcludes))
          );
          const buildRestored = plan.patch?.build_command === undefined
            || rollbackBuildCommand === (plan.previousBuildCommand ?? '');
          const deployRestored = plan.patch?.deploy_command === undefined
            || rollbackDeployCommand === (plan.previousDeployCommand ?? '');
          evidence.rollback.succeeded = branchesRestored && buildRestored && deployRestored;
        } catch (rollbackError) {
          evidence.rollback.succeeded = false;
          evidence.rollback.error = errorMessage(rollbackError);
        }
      }
    }

    await writeEvidence(config.evidencePath, evidence);
    throw error;
  }

  try {
    evidence.targetBuild.requested = true;
    evidence.targetBuild.buildUuid = await triggerExactBuild(
      providerConfig,
      plan.triggerUuid,
      providerConfig.targetCommitSha,
      fetchImpl,
    );
    evidence.verified = true;
    evidence.status = plan.productionPatchRequired ? 'applied-and-build-requested' : 'verified-and-build-requested';
    await writeEvidence(config.evidencePath, evidence);
    console.log('CLOUDFLARE_WORKERS_BUILD_TRIGGER_RECONCILED');
    return evidence;
  } catch (error) {
    evidence.status = 'trigger-verified-build-request-failed';
    evidence.error = errorMessage(error);
    evidence.verified = false;
    await writeEvidence(config.evidencePath, evidence);
    throw error;
  }
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  reconcileWorkersBuildTrigger({ apply: process.argv.includes('--apply') }).catch(() => {
    console.error('Cloudflare Workers Builds trigger reconciliation failed. Inspect the retained evidence artifact.');
    process.exit(1);
  });
}
