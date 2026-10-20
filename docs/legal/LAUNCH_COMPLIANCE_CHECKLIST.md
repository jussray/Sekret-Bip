# Se'kret Bip — Launch Compliance Checklist

**Version 1.1 — July 13, 2026**

This checklist is a release gate for any public production launch, public demo, app-store release, or production teen-data collection. A checked box must be backed by code, configuration, test evidence, or a signed operational/legal record.

A completed engineering slice does not replace counsel, safeguarding, accessibility, or founder approval.

## Age and Eligibility

- [ ] UI asks for date of birth or another approved age-eligibility signal before account creation.
- [ ] Users under 13 are blocked before non-essential personal information is collected.
- [ ] Server/API enforces the same minimum-age rule.
- [ ] Direct API and replay tests prove the UI gate cannot be bypassed.
- [ ] Demo environment warns users not to enter real personal, journal, voice, or crisis information unless approved for production data handling.

## Public Legal Documents

- [ ] Privacy Policy reviewed by counsel and published at a stable URL.
- [ ] Terms of Service reviewed by counsel and published at a stable URL.
- [ ] Privacy and Terms links appear during onboarding and in Settings.
- [ ] Material policy changes use age-appropriate notice.
- [ ] Legal business name, mailing address, and monitored contact addresses are present.

## Data Inventory and Minimization

- [ ] Deployed database schema matches the documented data inventory.
- [ ] Every Storage bucket and object path is documented.
- [ ] Analytics, crash reporting, push notification, email, moderation, AI, and voice vendors are inventoried.
- [ ] No behavioral advertising or sale of teen personal information.
- [ ] No unnecessary collection of location, contacts, or persistent advertising identifiers.
- [ ] Retention periods are documented for every category.

## Teen and Parent Separation

- [ ] Parent routes do not directly query private teen journals.
- [ ] Parent routes do not directly query private teen voice recordings.
- [ ] Parent routes do not access private companion or continuity memory.
- [ ] Parent routes do not access period data without explicit reviewed sharing.
- [ ] Parent-visible teen data is limited to explicit shares, authorized summaries, or safe aggregates.
- [ ] RLS tests cover linked, unlinked, pending, blocked, removed, revoked, expired, and deleted relationships.
- [ ] Sign-out clears private local caches on both sides.
- [ ] Controlled two-account Bridge production proof is recorded.

## Circle and Crew

- [ ] Circle identity is separate from private account identity.
- [ ] Bip ID discovery does not expose real names or private profile fields.
- [ ] Pending or blocked Crew relationships reveal no trusted profile details.
- [ ] Accepted Crew visibility is limited to user-selected social/support fields.
- [ ] Community reporting, blocking, and moderation flows are documented and tested.

## AI and Safety

- [ ] AI system prompts prohibit diagnosis, treatment claims, sexualized minor content, coercive dependency, and harmful instructions.
- [ ] Server-side safety controls fail safely.
- [ ] Saved AI responses are disclosed accurately in policy text.
- [ ] Vendor settings confirm API content is not used for model training unless explicitly opted in.
- [ ] Prompt/response retention and logging are documented.
- [ ] Crisis resources are localized by region.
- [ ] Imminent-danger copy directs users to local emergency services and a trusted nearby person.
- [ ] The two remaining custom-auth Edge Functions have negative-auth tests.

## Security

- [ ] Supabase service-role credentials never ship to the client.
- [ ] AI provider and internal shared secrets exist only in server-side secret storage.
- [ ] Repository and build logs contain no production secrets.
- [ ] RLS is enabled and behavior-tested on every user-data trust boundary.
- [x] `notification_deliveries` is documented and live-verified as service-role-only with no client grants. Evidence: `docs/security/SUPABASE_AUTHORIZATION_PHASE0.md`.
- [x] Server configuration tables expose no client grants and preserve service-role access. Evidence: migration `20260713011803` and the authorization baseline.
- [x] Obsolete release/probe Edge Functions are JWT-protected side-effect-free retirements with replacement evidence.
- [ ] High-blast-radius authenticated database functions have positive and negative behavior tests.
- [ ] Password-breach protection is enabled after signup, login, reset, and existing-account regression testing.
- [ ] Private Storage buckets use owner-scoped policies and deletion cleanup is proven.
- [ ] Incident-response and breach-notification procedures are approved.
- [ ] Dependency, secret, and configuration scans pass.

## Access, Correction, and Deletion

- [ ] Users can review core account information.
- [ ] Users can correct editable profile information.
- [ ] Teen account deletion removes teen-owned database rows and Storage objects.
- [ ] Parent account deletion preserves teen-private content.
- [ ] Teen deletion immediately revokes parent access.
- [ ] Deleted accounts cannot restore private content through sync.
- [ ] Deletion retries are idempotent.
- [ ] Legally required retention is documented, restricted, and time-limited.

## Memories and Continuity

- [ ] Durable continuity records have ownership and provenance.
- [ ] Users can correct and delete eligible continuity records.
- [ ] Expiration and retention behavior is enforced.
- [ ] Parent access is explicitly denied unless a reviewed share permits a minimized derivative.
- [ ] One real user-facing path consumes reviewed continuity data.
- [ ] Relationship phase is derived from persisted evidence rather than manufactured from empty counters.

L4 continuity remains planned until these requirements and their denial tests exist.

## Store and Launch Operations

- [ ] Apple age rating and content descriptors are reviewed.
- [ ] Google Play Teen rating and Data Safety form are reviewed.
- [ ] Support and privacy inboxes are monitored.
- [ ] Data-access and deletion request procedures are staffed.
- [ ] Vendor agreements and data-processing terms are archived.
- [ ] Exact Worker and Pages release commit is proven through `release.json`, Worker health, and production Playwright.
- [ ] Final legal review covers COPPA and applicable state/international teen privacy rules.

## Release Decision

- [ ] Engineering sign-off
- [ ] Security sign-off
- [ ] Product/privacy sign-off
- [ ] Accessibility sign-off
- [ ] Safeguarding sign-off
- [ ] Legal sign-off
- [ ] Founder release approval
