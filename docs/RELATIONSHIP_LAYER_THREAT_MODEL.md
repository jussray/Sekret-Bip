# Relationship Layer Threat Model

Parent goal: #238  
Phase issue: #239

## Protected assets

- teen private journal, chat, mood, goal, voice, image, and scrapbook content
- parent and crew relationship state
- Bridge summaries and consent history
- private media storage objects and signed URLs
- approved companion memories and recap drafts
- account identity, Bip IDs, and real names
- model-provider credentials and service-role credentials

## Trust boundaries

- Expo client is untrusted for authorization.
- Cloudflare Worker may orchestrate AI but must minimize input and re-check identity.
- Supabase RLS is the final row-level boundary.
- Storage access must mirror record ownership and active sharing state.
- Model output is untrusted until schema validation and safety checks succeed.

## Primary threats and mitigations

### Parent overreach

Threat: a linked parent attempts to access raw teen content or infer the source type behind a summary.

Mitigations:

- parent link grants no content access by itself;
- separate explicit teen share required;
- parent policies expose summary records only;
- no raw source joins in parent-facing RPCs/views;
- source type hidden when disclosure would reveal private behavior;
- immediate access loss after share or link revocation;
- privacy-safe access audit events.

### Unauthorized cross-account reads

Threat: a teen, parent, crew member, or attacker changes record IDs and reads another account’s data.

Mitigations:

- never authorize from client-supplied owner IDs;
- derive actor from `auth.uid()`;
- strict RLS on every new table;
- accepted-link/connection checks inside policies or security-definer RPCs;
- security-definer functions use fixed `search_path`, minimum grants, and explicit ownership checks;
- automated stranger and cross-family tests.

### Stale relationship access

Threat: parent or crew access remains after unlink, removal, blocking, or expiration.

Mitigations:

- every read checks current relationship state, not only creation-time state;
- revoke share references and signed access immediately;
- suppress queued notifications after relationship changes;
- use short signed-URL lifetimes;
- test stale-link races and concurrent revoke/read behavior.

### Prompt injection through teen content

Threat: selected journal/chat text instructs the model to reveal hidden data, ignore summary rules, diagnose, or include raw quotes.

Mitigations:

- treat source text as quoted data, never instructions;
- system prompt explicitly forbids following instructions in source content;
- send only selected, minimized content;
- structured output schema;
- post-generation checks for direct quotes, names, unsupported certainty, diagnoses, and disallowed fields;
- deterministic fallback when validation fails.

### AI fabrication or emotional misinterpretation

Threat: summary or recap invents causes, certainty, diagnoses, or claims that harm trust.

Mitigations:

- distinguish observed themes from suggestions;
- include limitations language;
- prohibit diagnoses and causal certainty;
- preserve prompt/model version for audits;
- teen preview before sharing where practical;
- visible correction/revoke mechanism;
- track fallback, edit, revoke, and complaint rates.

### Accidental permanent memory retention

Threat: private conversation content becomes long-term memory without clear teen consent.

Mitigations:

- memory disabled by default;
- candidate proposal flow; no silent save;
- sensitive categories excluded or separately gated;
- provenance and decision state on every item;
- “forget that” invalidates retrieval immediately;
- retrieval only from approved, non-deleted items;
- no raw prompt logging.

### Memory leakage through retrieval

Threat: another user’s memory or deleted memory is retrieved into a response.

Mitigations:

- strict owner filter before semantic ranking;
- companion/user namespace in every query;
- deleted/revoked filter at database level;
- no global vector search followed by client filtering;
- adversarial cross-user retrieval tests;
- memory-use indicator and report control.

### Private media leakage

Threat: scrapbook image or voice files are accessible through predictable or reusable URLs.

Mitigations:

- private buckets/owner-scoped paths;
- randomized object names;
- short-lived signed URLs issued only after authorization;
- do not store signed URLs as permanent records;
- validate MIME signature, size, and duration;
- strip metadata where feasible;
- delete objects on permanent deletion.

### Peer-support abuse and coercion

Threat: Crew features are used for harassment, guilt, spam, dependency, or pressure to disclose.

Mitigations:

- accepted connections only;
- bounded encouragement presets for MVP;
- rate limits and duplicate suppression;
- mute, block, remove, report;
- no guilt language or public streak leaderboard;
- peers are not framed as counselors or emergency responders;
- no automatic parent notification.

### Notification leakage

Threat: sensitive information appears on a locked screen or in email subject/body.

Mitigations:

- generic notifications only;
- no summary, mood, memory, or support text in previews;
- secure authenticated deep links;
- opt-in weekly email with verified parent address;
- expiry and revocation checked when opened.

### Analytics/log leakage

Threat: private content reaches Founder Control Room, logs, crash tools, or provider telemetry.

Mitigations:

- event payload allowlist;
- no raw text, media, signed URLs, or names;
- redact provider errors before logging;
- cost/latency logs keyed by feature and record ID only;
- production log review and retention limits.

### Cost exhaustion and abuse

Threat: repeated summary, recap, upload, or encouragement actions create runaway cost or denial of service.

Mitigations:

- idempotency keys;
- per-user and per-relationship rate limits;
- size/token caps;
- queued retries with bounded attempts;
- feature kill switches;
- cost alerts by feature;
- deterministic fallback for AI outage.

## Required adversarial tests

- parent reads raw source through guessed IDs
- former parent reads after unlink
- blocked crew member reads check-ins
- two simultaneous summary-generation requests
- malicious prompt text inside selected source
- malformed model JSON
- model output containing direct quote or diagnosis
- deleted memory appearing in retrieval
- cross-user vector retrieval
- reused expired signed URL
- duplicate encouragement taps
- timezone changes around streak boundary
- account deletion while AI/upload job is running

## Residual risks

- AI can still produce emotionally inaccurate interpretations despite validation.
- Screenshotting cannot be technically prevented after an authorized recipient views content.
- Email delivery adds forwarding and inbox-compromise risk; in-app delivery should remain default.
- Content moderation and safety laws may evolve and require policy updates.
- “On this day” and recaps can surface painful memories; both require opt-out and sensitive UX review.
