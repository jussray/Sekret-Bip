# Relationship Layer Data Flows

Parent goal: #238  
Phase issue: #239

## Shared trust boundary

All flows use this order:

1. Expo client gathers an explicit user action.
2. Client sends only the minimum required identifiers and content.
3. Cloudflare Worker or Supabase RPC verifies authentication and authorization.
4. Supabase RLS remains the final database boundary.
5. Privacy-safe events record state changes without raw teen content.

Feature flags control availability only. They never replace authorization.

---

## Phase 1 — Bridge Summary

```text
Teen selects eligible source items
  -> client builds preview from local/display-safe metadata
  -> teen confirms exact parent + exact source set
  -> server validates active parent link
  -> bridge share request created as pending
  -> service fetches only selected teen-owned sources
  -> content minimized/redacted
  -> AI summary requested with versioned structured-output prompt
  -> output schema validated
      -> valid: summary stored as ready
      -> invalid/unavailable: deterministic fallback stored
  -> parent reads summary only through active-link + non-revoked policy
  -> view event recorded without summary text
```

### Revocation

```text
Teen revokes share or parent link
  -> share status becomes revoked
  -> parent read access ends immediately
  -> signed links/tokens become unusable
  -> revocation event recorded
```

### Failure states

- inactive or revoked parent link
- source no longer exists
- source is not owned by requesting teen
- duplicate request
- Worker timeout
- malformed model output
- model unavailable
- summary expired before parent view

Raw source content is never copied into analytics, notifications, or email previews.

---

## Phase 2 — Crew Accountability

```text
Teen A invites Teen B through existing Bip ID/crew model
  -> connection remains pending
  -> no support activity or real-name access
Teen B accepts
  -> connection becomes accepted
  -> mutual support preferences become available
Teen A posts daily emoji check-in
  -> client uses idempotency key for local date + owner
  -> server validates accepted connection
  -> check-in stored owner-scoped
  -> Teen B may view only allowed shared fields
Teen B sends bounded encouragement preset
  -> rate limit checked
  -> encouragement stored
  -> optional in-app notification with no sensitive text
```

### Removal/blocking

```text
Either teen removes or blocks
  -> connection state changes
  -> reads and writes stop immediately
  -> pending notifications are suppressed where possible
  -> historical content follows retention contract
```

No public feed, public leaderboard, location sharing, or automatic parent visibility is introduced.

---

## Phase 3 — Emotional Scrapbook

```text
Teen creates draft memory
  -> local draft stores text/layout metadata
  -> media validated for type/size/duration
  -> EXIF/metadata stripped where feasible
  -> media uploaded to owner-scoped private path
  -> database record created only after required uploads succeed
  -> memory defaults to private
```

### Explicit sharing

```text
Teen chooses one destination
  -> destination-specific consent preview
  -> server validates destination membership/link
  -> share reference created without changing original private default
  -> recipient receives short-lived authorized access
```

### Delete

```text
Teen permanently deletes memory
  -> record marked deleting
  -> destination share references revoked
  -> storage objects deleted
  -> record tombstoned/deleted per retention policy
  -> privacy-safe deletion event emitted
```

Upload failure must leave a visible recoverable draft, not a false completed memory.

---

## Phase 4 — Persistent Companion Memory

```text
Teen opts into memory
  -> preference stored
Conversation occurs
  -> model/service may propose a candidate memory
  -> candidate shown to teen
      -> approve: stored as approved
      -> edit: edited value stored as approved
      -> reject: candidate rejected
      -> never remember: preference rule stored
Future turn
  -> server verifies user + memory enabled
  -> filters by owner and non-deleted status
  -> selects minimum relevant approved memories
  -> response generated
  -> UI indicates memory was used
```

### Forget flow

```text
Teen selects “forget that”
  -> memory marked deleted/revoked
  -> retrieval cache invalidated
  -> future retrieval excludes item immediately
  -> deletion event records ID/category only, never value
```

### Monthly recap

```text
Scheduled or on-demand recap request
  -> activity facts aggregated without raw private content by default
  -> approved memories optionally included
  -> AI separates observed facts from interpretation
  -> teen previews/edits
  -> save is optional
  -> parent sharing requires a separate explicit Bridge action
```

---

## Cross-phase event allowlist

Allowed event payloads include:

- feature key
- record ID
- state transition
- actor role
- timestamps
- retry/fallback flags
- model/prompt version
- latency and token counts
- destination type

Disallowed payloads include:

- journal text
- chat text
- summary text
- memory values
- image/voice contents
- signed URLs
- names of friends or family
- diagnosis or inferred mental-health labels
