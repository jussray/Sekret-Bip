// Non-authorizing, fail-closed preflight for a proposed external AI Labyrinth
// product. This module MUST NOT be used as proof of an active license or as
// an API authorization middleware. No payment or external execution is live.
import { readFileSync } from 'node:fs';

const policy = JSON.parse(readFileSync(new URL('../security/ai-labyrinth-external-access.policy.json', import.meta.url), 'utf8'));
const permittedFields = new Set(['resource', 'environment', 'dataClass', 'capability']);
const capabilities = new Set(policy.licensedCapabilities);
const deny = (reason) => Object.freeze({ decision: 'DENY', reason, permitsExecution: false });

export function assessProposedLabyrinthLicenseRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return deny('INVALID_REQUEST');
  }
  // Never accept payment receipts, user IDs, role claims, verified-email flags,
  // auth headers, user payloads, or any other caller-supplied "proof".
  if (Object.keys(request).some((key) => !permittedFields.has(key))) {
    return deny('UNTRUSTED_AUTHORITY_OR_PAYLOAD');
  }
  if (request.resource !== policy.licenseScope.resource) {
    return deny('PROTECTED_OR_UNKNOWN_RESOURCE');
  }
  if (request.environment !== policy.licenseScope.environment) {
    return deny('NON_ISOLATED_ENVIRONMENT');
  }
  if (request.dataClass !== 'synthetic') {
    return deny('USER_OR_UNKNOWN_DATA_CLASS');
  }
  if (typeof request.capability !== 'string' || !capabilities.has(request.capability)) {
    return deny('UNKNOWN_CAPABILITY');
  }
  // Even the correctly shaped request is not authorization. The trusted
  // server identity/entitlement verifier and isolated runtime do not exist
  // under this proposal, so payment and a self-asserted identity grant nothing.
  return Object.freeze({
    decision: 'REVIEW_REQUIRED',
    reason: 'EXTERNAL_ACCESS_NOT_ACTIVATED',
    permitsExecution: false,
  });
}

export function externalLabyrinthExecutionIsEnabled() {
  return policy.status === 'active'
    && policy.launchControls.billingEnabled === true
    && policy.launchControls.externalExecutionEnabled === true
    && policy.launchControls.productionIntegrationEnabled === false
    && policy.launchControls.userDataAccessEnabled === false;
}
