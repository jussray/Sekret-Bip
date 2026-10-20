# Se'kret Bip — Data Deletion Requirements

**Version 1.0 — June 2026**

## Purpose

This document defines the minimum behavior required for a production-grade **Delete My Account** flow. Clearing local state, signing out, disabling an account, or deleting only the authentication user does not count as complete deletion.

## User Experience

Both teen and parent accounts must have an in-app deletion control that:

1. explains what will be deleted;
2. explains any legally required retention exceptions;
3. requires a deliberate confirmation step;
4. re-authenticates the user when appropriate;
5. returns a deletion receipt or confirmation state;
6. signs the user out and clears private local caches after server deletion succeeds.

## Teen Account Deletion Scope

Deletion must remove or anonymize, as applicable:

- authentication account and account profile;
- Bip ID and profile preferences;
- Circle identity and avatar metadata;
- private Pages and saved companion replies;
- journal attachments and private storage objects;
- voice recordings and transcripts;
- mood history and calm activity;
- Circle posts and reactions according to the product's deletion policy;
- Crew memberships, invitations, and check-ins;
- Bippin 2 points, streaks, rewards, milestones, and growth history;
- Bridge permissions, teen-selected shares, and support history;
- Profile memory markers;
- Oracle or companion memory owned by the teen;
- analytics identifiers not required for security or legal compliance;
- device-local private caches.

## Parent Account Deletion Scope

Deletion must remove or anonymize, as applicable:

- authentication account and parent profile;
- Parent Bip ID and Parent Circle identity;
- Parent Pages and parent voice reflections;
- Parent Circle posts and reactions;
- parent-authored notes, goals, support responses, and memories;
- parent-side Bridge relationship records;
- linked-account permissions originating from the parent account;
- subscription/customer references according to billing requirements;
- device-local private caches.

Deleting a parent account must not delete a teen's private account content. Deleting a teen account must revoke the parent's access to all teen-originated shared content and relationship data.

## Storage Deletion

Database deletion alone is insufficient. The deletion job must enumerate and remove private files from all user-owned storage buckets, including voice, images, videos, avatars, and future memory attachments.

Storage paths must be owner-scoped and testable. Orphaned storage objects must be detected and cleaned up.

## Relational Cleanup

Deletion must account for foreign keys and shared records, including:

- accepted, pending, blocked, removed, and expired Crew relationships;
- parent/teen links;
- Bridge shares and responses;
- reactions and derived counts;
- point-ledger and event-history records;
- notification records;
- moderation and safety records.

Where a shared record cannot be fully deleted without corrupting another user's record, it must be anonymized or detached according to a documented policy.

## Safety and Legal Retention

Any retention for fraud prevention, security, legal claims, child-safety reporting, or billing must be:

- narrowly scoped;
- documented in the Privacy Policy;
- access restricted;
- automatically deleted when the retention period expires;
- excluded from normal product access after account deletion.

## Implementation Requirements

- Server-side privileged deletion function; never expose service-role credentials to the client.
- Idempotent deletion so retries are safe.
- Transactional database cleanup where possible.
- Storage cleanup with retry and failure reporting.
- Audit event containing only the minimum deletion metadata.
- No raw deleted content in logs.
- Local cache wipe only after the server request is accepted or completed according to the chosen deletion model.

## Required Tests

- Teen deletion removes teen-owned database rows.
- Teen deletion removes teen-owned storage objects.
- Parent deletion removes parent-owned records but preserves teen-private content.
- Teen deletion revokes parent access immediately.
- Deleted users cannot sign in or restore deleted private content from sync.
- Retried deletion requests do not fail or recreate records.
- Orphaned file detection returns zero after deletion.
- Logs contain no deleted journal or voice content.

## Launch Gate

Public launch is blocked until the complete deletion flow has passed database, storage, relationship, local-cache, and privacy tests in a production-like environment.
