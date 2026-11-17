# Public privacy and deletion publication gate

## Purpose

The website, app settings, privacy policy, and production deletion processor must describe one account-deletion system. Public copy must follow the deployed behavior rather than a draft checklist.

## Canonical public wording

> Account deletion requests include a seven-day grace period. You may cancel during that period. Once processing begins, associated account-owned data is removed according to our deletion and retention procedures.

## Required site surfaces

Before the public site is treated as launch-ready, verify that each surface exists and uses the canonical wording:

- Website footer: Privacy, Terms, and Support links
- Public privacy page: account deletion and retention section
- App Settings: Schedule account deletion
- Pending state: scheduled deletion date and cancel action
- Processing state: clear notice that cancellation is no longer available
- Support path: `support@sekretbip.net`

## Truth boundaries

Do not publish claims that are not backed by current evidence, including:

- instant deletion
- a thirty-day deletion period when the product uses a seven-day grace period
- HIPAA compliance or eligibility as a substitute for an executed BAA and correct operating controls
- SOC 2 certification before an audit report exists
- completed DPAs before the executed agreements are retained
- zero-retention AI processing unless the configured provider account and endpoint are verified
- specific encryption versions or incident-response deadlines unless they are verified operational commitments

## Legal completion gate

The current draft privacy policy still requires founder/legal decisions for the legal entity name, mailing address, privacy contact, effective date, final vendor list, retention schedule, and signed processor agreements. Do not present the draft as an executed legal policy until those fields are resolved.

## Verification evidence

Launch evidence should include:

1. Desktop and mobile screenshots of the footer and privacy page.
2. A browser test opening Privacy, Terms, Support, and Account Deletion routes.
3. A controlled account showing request, scheduled date, cancellation, and processing states.
4. Supabase evidence that the canonical migration and Edge Functions are deployed.
5. A successful scheduled sweep record with secrets redacted.

## Rollback

If public copy drifts from runtime behavior, remove the inaccurate claim or route from publication, restore the last verified copy, and reopen the launch gate until browser and backend evidence agree.
