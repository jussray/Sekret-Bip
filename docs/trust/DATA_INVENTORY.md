# Bip Data Inventory

> **Trust-01** · Living document — update whenever a new field is added or removed.
> Last updated: 2026-07-14

---

## Regulatory Scope

| Question | Decision | Notes |
|---|---|---|
| Is Bip a medical device (SaMD)? | **No** | Wellness support only. No diagnostics, no treatment claims. |
| Does HIPAA apply? | **TBD** | Review if any clinical partner integration is added. Currently: no covered-entity relationship. |
| Does COPPA apply? | **Yes, conditionally** | If any user is under 13, full COPPA compliance required. Age gate at signup. |
| Does GDPR apply? | **Yes** | App available in EU/UK. Lawful basis: consent. |
| Does CCPA apply? | **Yes** | California users. No sale of personal data. |

---

## Data Fields Collected at Signup / Onboarding

| Field | Why Collected | Storage | Retention | Deletion | Sensitive? |
|---|---|---|---|---|---|
| Email address | Account identity, login | Supabase Auth | Until account deleted | Full deletion on account delete | Low |
| Display name (optional) | Personalization | Supabase DB | Until account deleted | Full deletion | Low |
| Date of birth / age range | Age verification, COPPA gate | Supabase DB | Until account deleted | Full deletion | Medium |
| Profile photo (optional) | Avatar | Supabase Storage | Until removed by user | Full deletion | Low |
| Consent timestamps | Audit trail | Supabase DB | 7 years (legal) | Anonymized, not deleted | Low |

---

## Data Fields Generated During Use

| Field | Why Collected | Storage | Retention | Deletion | Sensitive? |
|---|---|---|---|---|---|
| Mood log entries | Core feature | Supabase DB | Until account deleted | Full deletion | **HIGH** |
| Journal / free-text entries | Core feature | Supabase DB | Until account deleted | Full deletion | **HIGH** |
| Chat/AI message history | Feature continuity | Supabase DB | 90 days rolling (TBD) | Full deletion | **HIGH** |
| Room/space activity metadata | Feature analytics | Supabase DB | 30 days | Auto-purged | Medium |
| Session metadata (timestamps, device type) | Abuse detection, debugging | Cloudflare Worker logs | 7 days | Auto-purged | Low |
| Push notification tokens | Notification delivery | Supabase DB | Until unsubscribed | Full deletion | Low |
| Crash / error reports | Stability | Error monitoring service | 30 days | Auto-purged | Low |

---

## Third-Party Data Sharing

| Provider | What They Receive | Purpose | Data Processing Agreement? |
|---|---|---|---|
| Supabase | All DB fields above | Backend infrastructure | Yes (Supabase DPA) |
| Cloudflare | Request metadata, Worker logs | Edge compute, CDN | Yes (Cloudflare DPA) |
| Expo / EAS | Build metadata, push tokens | App delivery | Review required |
| AI/LLM provider (TBD) | Chat message content | AI responses | **Must have DPA before launch** |

> ⚠️ **No advertising data sharing. No sale of teen user data. Ever.**

---

## Advertising & Analytics

- No advertising SDKs
- No third-party advertising data sharing
- Internal analytics only (anonymized aggregates)
- Teen users (under 18): zero data for advertising purposes regardless of consent

---

## Open Items

- [ ] Confirm AI/LLM provider DPA before launch
- [ ] Define exact chat retention period (90 days proposed)
- [ ] Confirm Expo EAS data handling for push tokens
- [ ] Add encryption-at-rest confirmation for HIGH sensitivity fields
- [ ] Document Supabase RLS policies in place for each table
