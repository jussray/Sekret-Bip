# Stateful Memory must report to the Control Room

This is the operating rule for the next product phase: character memory is not a hidden subsystem. Memory health, failures, privacy skips, and latency must report into the Founder Control Room.

## Phase 1 scope

Each Bip character gets per-teen episodic memory:

- Raylene
- Rylane
- Cloud
- Night

The memory system stores short compressed memories, not raw journal entries, raw chat text, transcripts, audio, or full generated replies.

## Required Control Room signals

Every memory operation should emit privacy-safe metadata through the existing runtime audit and Worker telemetry path.

### Memory write signals

- `memory_write_success`
- `memory_write_failed`
- `memory_write_skipped_privacy`
- `memory_compression_failed`
- `memory_embedding_failed`
- `memory_importance_scored`

### Memory retrieval signals

- `memory_retrieve_success`
- `memory_retrieve_empty`
- `memory_retrieve_failed`
- `memory_match_rpc_failed`
- `memory_context_injected`
- `memory_context_skipped`

### Memory safety signals

- `memory_redaction_applied`
- `memory_sensitive_content_blocked`
- `memory_policy_violation_detected`
- `memory_character_mismatch`

## Control Room category mapping

Memory events should normalize into Control Room issues with:

- source: `runtime` or `cloudflare_log`
- category: `memory`
- affected_surface: `journal`, `voice_bip`, `pages`, or the calling surface
- fingerprint: stable event name plus character and operation

Examples:

```text
memory:memory_write_failed:raylene
memory:memory_retrieve_empty:night
memory:memory_embedding_failed:cloud
memory:memory_policy_violation_detected:rylane
```

## Allowed metadata

Memory telemetry may include:

- `character_id`
- `surface`
- `operation`
- `status`
- `duration_ms`
- `memory_count`
- `match_count`
- `importance`
- `provider`
- `model`
- `fallback_used`
- `error_name`
- `redaction_applied`
- `privacy_skip_reason`

## Forbidden metadata

Memory telemetry must never include:

- raw journal text
- raw chat messages
- raw voice transcripts
- raw audio
- full generated replies
- full memory content
- names from private entries
- provider keys
- auth tokens
- Supabase service credentials

## Issue thresholds

The Control Room should create or escalate issues when:

- write failure rate rises above normal
- retrieval repeatedly returns empty for active users
- embedding provider fails or times out
- memory RPC fails
- privacy skips spike
- the wrong character reads another character's memories
- latency crosses the configured threshold

## Dashboard widgets

Founder dashboards should eventually show:

- memory writes by character
- retrieval success rate
- empty retrieval rate
- privacy skip count
- average memory retrieval latency
- top memory failure fingerprints
- memory health by surface

## Implementation note

The first implementation can use the existing `emitWorkerTelemetry` shape and the existing Control Room ingestion path. Add memory-specific fields only by allowlist. Do not create a separate memory dashboard outside the Control Room.
