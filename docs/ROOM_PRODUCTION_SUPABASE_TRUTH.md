# Room Production Supabase Truth

**Status:** current-main review contract for Batch 481.5

## Confession

The room runtime is not starting from a blank database. The live Se’kret Bip Supabase project already contains `room_memory`, profile companion selections, daily-intention companion keys, and other character-keyed records. Several database constraints still use legacy identifiers such as `raylene` and `rylane`.

This follow-up must remain schema-neutral. It may build a Night-only visual/runtime slice, but it must not claim that the full character canon has been migrated in Supabase.

## Locked boundary

- No production migration is part of this branch.
- No table, function, policy, enum, check constraint, or stored row is changed by the room-production work.
- Room state persistence remains compatible with the existing `room_memory` contract.
- A later database migration must explicitly map legacy character keys to the final canon and include rollback, RLS review, generated TypeScript types, and exact client compatibility tests.
- Product Design copy and agent documentation must use **Suhana**, **Sy**, **Night**, and **Cloud** as current-facing canon while marking database legacy keys as compatibility identifiers only.

## Live findings reviewed July 24, 2026

- The project is active and healthy.
- `public.room_memory` exists with RLS enabled and currently stores a single character key plus last visit/hotspot/summon state.
- `public.app_profiles.selected_companion`, `public.daily_intentions.companion_key`, and `public.bridge_signals.char_key` contain legacy character-key constraints.
- The Supabase security advisor reports a broad existing backlog, including anonymous-access-policy warnings and authenticated-callable `SECURITY DEFINER` functions.

These findings were not introduced by the room manifest merge, but they prevent a truthful claim that database security or character-key migration is complete.

## FutureYou merge gate

This follow-up may merge only when it remains database-neutral and proves:

1. no migration or generated database type drift;
2. no new direct Supabase write path;
3. Night runtime gracefully operates without changing existing rows;
4. legacy keys are documented rather than silently reinterpreted;
5. the security-advisor backlog is recorded as separate remediation work, not hidden inside Product Design completion language.
