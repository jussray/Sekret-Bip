import type { Principal } from './auth';
import { getModels } from './config/models';
import {
  FAMILY_VISIT_JSON_SCHEMA,
  familyVisitSummariesPassSafety,
  isFamilyVisitGeneratedSummaries,
  type FamilyVisitGeneratedSummaries,
} from './bridge-family-visit-validator';
import {
  createBridgeFamilyVisitStore,
  type BridgeFamilyVisitMarkerRow,
  type BridgeFamilyVisitReflectionRow,
  type BridgeFamilyVisitStoreEnv,
} from './bridge-family-visit-store';

interface BridgeFamilyVisitEnv extends BridgeFamilyVisitStoreEnv {
  OPENAI_API_KEY?: string;
  OPENAI_CHAT_MODEL?: string;
  /**
   * Server-side rollout gate. Unset/disabled fails closed. `enabled` permits
   * all otherwise-authorized professionals. A comma-separated user-id list is
   * a controlled cohort. This is intentionally separate from client flags.
   */
  BRIDGE_FAMILY_VISITS_ROLLOUT?: string;
}

interface FamilyVisitGenerateBody {
  sessionId?: unknown;
}

const PROMPT_VERSION = 'bridge-family-visit-human-v1';

const FAMILY_VISIT_SYSTEM_PROMPT = `
You create TWO different human-readable Se'kret Bridge summaries from a visible Family Visit Mode session.

The session was NOT recorded. Your only evidence is structured participant-selected markers and structured post-visit reflections. Never imply you heard, watched, recorded, transcribed, or continuously monitored the encounter.

EVIDENCE LABELS:
- OBSERVED = a structured marker/reflection was explicitly submitted by a participant. It does NOT mean Se'kret passively observed the room.
- INFERRED = a cautious interpretation supported by structured inputs. Use may, might, could, or suggests.
- UNKNOWN = the structured evidence is insufficient.
- HUMAN_REVIEW = a human professional should interpret the situation; Se'kret is not deciding it.

PARENT SUMMARY PURPOSE:
Help the parent understand how the interaction may have landed emotionally for the child and what could help connection next time.
- Do not reveal the professional's review signal, internal professional framing, or professional disposition.
- Do not state the child's internal feelings as fact.
- Never shame, grade, diagnose, or label the parent.
- Keep next-time suggestions gentle and practical.

PROFESSIONAL SUMMARY PURPOSE:
Help an assigned CYS/court/CASA/agency professional understand whether the structured encounter signals look child-centered and what deserves human review.
- Report patterns and uncertainty, not legal findings.
- Never decide custody, visitation, parental fitness, abuse, neglect, or court outcomes.
- Never diagnose anyone.
- disposition is only one of: supportive, mixed, needs_human_review, insufficient_evidence. It is a support-review routing label, not a legal/safety adjudication.
- Every item in humanReview must use classification HUMAN_REVIEW.

FOR BOTH AUDIENCES:
- No invented quotes or dialogue.
- No names, case numbers, identifiers, or exact timestamps.
- No clinical labels.
- No certainty beyond the structured input.
- limitations must say that Se'kret did not record the visit and that the summary is not a legal or clinical decision.
- Return only JSON matching the provided schema.
`.trim();

const FALLBACK_SUMMARIES: FamilyVisitGeneratedSummaries = {
  parent: {
    childExperience: [
      {
        classification: 'UNKNOWN',
        text: 'There is not enough child-selected reflection to say clearly how the interaction may have landed.',
      },
    ],
    connectionMoments: [],
    nextTime: [
      'Ask what felt supportive and what they would like more or less of next time.',
      'Make it easy to ask for a pause without needing a big explanation.',
    ],
    uncertainty: 'Structured reflections are limited, so Se’kret is keeping the interpretation deliberately cautious.',
    limitations: 'Se’kret did not record the visit. This reflection summary is not a legal or clinical decision.',
  },
  professional: {
    interactionPatterns: [],
    childCenteredSignals: [],
    humanReview: [
      {
        classification: 'HUMAN_REVIEW',
        text: 'A human professional should review the encounter because child-selected input is too limited for a reliable automated summary.',
      },
    ],
    disposition: 'insufficient_evidence',
    uncertainty: 'The structured participant evidence is too limited to characterize the encounter reliably.',
    limitations: 'Se’kret did not record the visit and does not make legal or clinical decisions.',
  },
};

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function requireUser(principal: Principal): string {
  if (principal.kind !== 'user') throw new Error('user_jwt_required');
  return principal.userId;
}

export function isBridgeFamilyVisitsRolloutAllowed(env: Pick<BridgeFamilyVisitEnv, 'BRIDGE_FAMILY_VISITS_ROLLOUT'>, userId: string): boolean {
  const raw = env.BRIDGE_FAMILY_VISITS_ROLLOUT?.trim();
  if (!raw || raw === 'disabled') return false;
  if (raw === 'enabled') return true;
  return raw.split(',').map((value) => value.trim()).filter(Boolean).includes(userId);
}

function assignmentIsCurrent(status: string, expiresAt: string | null): boolean {
  if (status !== 'active') return false;
  if (!expiresAt) return true;
  const expires = new Date(expiresAt).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

function hasAllAcknowledgements(session: {
  teen_acknowledged_at: string | null;
  parent_acknowledged_at: string | null;
  professional_acknowledged_at: string | null;
}): boolean {
  return Boolean(
    session.teen_acknowledged_at
      && session.parent_acknowledged_at
      && session.professional_acknowledged_at,
  );
}

function hasAllParticipantReflections(reflections: BridgeFamilyVisitReflectionRow[]): boolean {
  const roles = new Set(reflections.map((reflection) => reflection.actor_role));
  return roles.has('teen') && roles.has('parent') && roles.has('professional');
}

function hasTeenSelectedInput(markers: BridgeFamilyVisitMarkerRow[], reflections: BridgeFamilyVisitReflectionRow[]): boolean {
  return markers.some((marker) => marker.actor_role === 'teen')
    || reflections.some((reflection) => reflection.actor_role === 'teen');
}

function minimizedEvidence(markers: BridgeFamilyVisitMarkerRow[], reflections: BridgeFamilyVisitReflectionRow[]) {
  return {
    sessionMode: 'visible_reflection_only',
    captureMode: 'none',
    markers: markers.map(({ actor_role, marker_key }) => ({ role: actor_role, key: marker_key })),
    reflections: reflections.map((reflection) => ({
      role: reflection.actor_role,
      feltHeard: reflection.felt_heard,
      feltComfortable: reflection.felt_comfortable,
      couldPause: reflection.could_pause,
      connectionAfter: reflection.connection_after,
      nextSupport: reflection.next_support,
      reviewSignal: reflection.review_signal,
    })),
  };
}

async function requestCompletion(
  apiKey: string,
  model: string,
  evidence: ReturnType<typeof minimizedEvidence>,
  correction?: string,
): Promise<unknown> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: FAMILY_VISIT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Structured Family Visit Mode evidence only:\n${JSON.stringify(evidence)}`,
    },
  ];
  if (correction) messages.push({ role: 'system', content: correction });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_schema', json_schema: FAMILY_VISIT_JSON_SCHEMA },
      messages,
    }),
  });
  if (!response.ok) throw new Error(`openai_${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

async function generateSummaries(
  env: BridgeFamilyVisitEnv,
  markers: BridgeFamilyVisitMarkerRow[],
  reflections: BridgeFamilyVisitReflectionRow[],
): Promise<{ summaries: FamilyVisitGeneratedSummaries; model: string } | null> {
  if (!env.OPENAI_API_KEY || !hasTeenSelectedInput(markers, reflections)) return null;

  const models = getModels({
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_CHAT_MODEL: env.OPENAI_CHAT_MODEL,
  });
  const evidence = minimizedEvidence(markers, reflections);

  try {
    const first = await requestCompletion(env.OPENAI_API_KEY, models.chat, evidence);
    if (isFamilyVisitGeneratedSummaries(first) && familyVisitSummariesPassSafety(first)) {
      return { summaries: first, model: models.chat };
    }

    const retry = await requestCompletion(
      env.OPENAI_API_KEY,
      models.chat,
      evidence,
      'Your previous response crossed the Family Visit safety or audience boundary. Remove legal/clinical conclusions, certainty about the child’s inner state, invented dialogue, and any professional-only framing from the parent summary. Keep evidence classifications explicit and return only schema-valid JSON.',
    );
    if (isFamilyVisitGeneratedSummaries(retry) && familyVisitSummariesPassSafety(retry)) {
      return { summaries: retry, model: models.chat };
    }
    return null;
  } catch {
    return null;
  }
}

export async function handleBridgeFamilyVisitSummaryGenerate(
  request: Request,
  env: BridgeFamilyVisitEnv,
  principal: Principal,
  cors: Record<string, string>,
): Promise<Response> {
  let body: FamilyVisitGenerateBody;
  try {
    body = await request.json() as FamilyVisitGenerateBody;
  } catch {
    console.warn('[bridge-family-visit] invalid JSON request body');
    return json({ error: 'Invalid JSON' }, 400, cors);
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) return json({ error: 'sessionId is required' }, 400, cors);

  try {
    const userId = requireUser(principal);
    if (!isBridgeFamilyVisitsRolloutAllowed(env, userId)) {
      return json({ sessionId, status: 'blocked', failureCode: 'family_visit_mode_disabled' }, 403, cors);
    }

    const store = createBridgeFamilyVisitStore(env);
    const session = await store.fetchSession(sessionId);
    if (!session) return json({ error: 'session not found' }, 404, cors);
    if (session.capture_mode !== 'none') {
      return json({ sessionId, status: 'blocked', failureCode: 'capture_mode_invalid' }, 409, cors);
    }
    if (!hasAllAcknowledgements(session)) {
      return json({ sessionId, status: 'blocked', failureCode: 'participant_acknowledgement_required' }, 409, cors);
    }

    const assignment = await store.fetchAssignment(session.assignment_id);
    if (!assignment) return json({ error: 'assignment not found' }, 404, cors);
    if (assignment.professional_user_id !== userId) {
      return json({ sessionId, status: 'blocked', failureCode: 'professional_assignment_required' }, 403, cors);
    }
    if (!assignmentIsCurrent(assignment.status, assignment.expires_at)) {
      return json({ sessionId, status: 'blocked', failureCode: 'assignment_not_current' }, 409, cors);
    }

    const professional = await store.fetchProfessionalProfile(userId);
    if (!professional || professional.verification_status !== 'verified') {
      return json({ sessionId, status: 'blocked', failureCode: 'professional_verification_required' }, 403, cors);
    }

    if (session.state === 'ready') {
      return json({ sessionId, status: 'ready', summariesGenerated: ['parent', 'professional'] }, 200, cors);
    }
    if (session.state !== 'reflection') {
      return json({ sessionId, status: 'blocked', failureCode: 'reflection_state_required' }, 409, cors);
    }

    const [markers, reflections] = await Promise.all([
      store.fetchMarkers(sessionId),
      store.fetchReflections(sessionId),
    ]);

    if (!hasAllParticipantReflections(reflections)) {
      return json({
        sessionId,
        status: 'blocked',
        failureCode: 'participant_reflections_required',
      }, 409, cors);
    }

    const generated = await generateSummaries(env, markers, reflections);
    const summaries = generated?.summaries ?? FALLBACK_SUMMARIES;
    const model = generated?.model ?? null;
    const usedFallback = !generated;

    // Persist audience rows separately. The professional caller receives no
    // summary content here; RLS on the summary table decides which audience can
    // read which row after generation.
    await store.upsertSummary(sessionId, {
      audience: 'parent',
      content: summaries.parent as unknown as Record<string, unknown>,
      limitations: summaries.parent.limitations,
      promptVersion: PROMPT_VERSION,
      model,
      usedFallback,
    });
    await store.upsertSummary(sessionId, {
      audience: 'professional',
      content: summaries.professional as unknown as Record<string, unknown>,
      limitations: summaries.professional.limitations,
      promptVersion: PROMPT_VERSION,
      model,
      usedFallback,
    });
    await store.markSessionReady(sessionId);

    return json({
      sessionId,
      status: 'ready',
      summariesGenerated: ['parent', 'professional'],
      usedFallback,
      promptVersion: PROMPT_VERSION,
    }, 200, cors);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server_error';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('[bridge-family-visit] summary generation failed', { errorName });
    if (message === 'user_jwt_required') return json({ error: message }, 403, cors);
    return json({ sessionId, status: 'failed', failureCode: 'server_error' }, 500, cors);
  }
}
