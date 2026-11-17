# Se'kret Bip Resend domain truth — 2026-09-12

## VERIFIED

- Canonical Resend account exposes one Se'kret Bip domain: `sekretbip.net`.
- Its current Resend verification state is `failed`.
- Required DNS records currently failing in Resend are:
  - DKIM TXT at `resend._domainkey`.
  - SPF/return-path MX at `send` with priority 10.
  - SPF TXT at `send`.
- The repository's Supabase Auth email reconciler currently defaults to `invite@mail.sekretbip.com`, which does not match the domain present in Resend.

## FIX BOUNDARY

Normalize repository sender defaults and operator documentation to `invite@sekretbip.net`.

Do not claim production email delivery is repaired until `sekretbip.net` verifies successfully in Resend, Supabase Auth is reconciled against the verified sender, and live signup / confirmation / returning-sign-in / recovery Playwright evidence passes.

## AUTHORITY

Domain verification evidence is provider state. It may invalidate stale sender assumptions, but it does not grant DNS, Supabase Auth, or email-send authority by itself.
