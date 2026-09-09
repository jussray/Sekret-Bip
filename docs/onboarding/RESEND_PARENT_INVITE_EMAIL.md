# Resend parent invite email setup

This document records the safe operator setup for Se'kret Bip onboarding parent/trusted-adult invite emails.

## Current repo state

PR #546 added the code boundary for parent-link invite email delivery:

- the teen can still display an eight-character invite code;
- email delivery is optional;
- email failure must not block the manual code path;
- invite email copy must not include private teen content;
- production sending happens from the Supabase Edge Function runtime, not from Expo/client code.

Runtime tracking:

- Se'kret Bip runtime gate: #547
- Se'kret Bip repo/MCP setup tracking: #548
- Founder Control Room gate: jussray/founder-control-room#62

## Required production secrets

Never commit or paste the real API key in GitHub, Expo, Cloudflare public env, issues, PR comments, or chat logs.

```txt
RESEND_API_KEY=<real Resend API key beginning with re_>
PARENT_INVITE_FROM_EMAIL=Se'kret Bip <invite@mail.sekretbip.com>
```

Alternative sender only if the root domain is verified in Resend:

```txt
PARENT_INVITE_FROM_EMAIL=Se'kret Bip <invite@sekretbip.com>
```

These values belong in Supabase Edge Function secrets for project `tbsevonvegdnlyjgplmm`.

## Resend MCP role

Resend MCP is for founder/operator agents to inspect and manage Resend infrastructure, such as domains, logs, and test sends. It is not the production app runtime.

The production app runtime is:

```txt
Teen UI -> Supabase client session -> parent-link-create Edge Function -> Resend API
```

The MCP/operator lane is:

```txt
Founder/operator agent -> Resend MCP -> Resend dashboard/API
```

Keep these separate so onboarding never depends on an agent being online.

## MCP server endpoint

Use the hosted Resend MCP server:

```txt
https://mcp.resend.com/mcp
```

Do not use the documentation URL as the server URL.

## Codex MCP example

```bash
codex mcp add resend --url https://mcp.resend.com/mcp
```

For a headless/non-browser client, use an Authorization header with a locally stored API key. Do not commit the key.

## OpenCode local MCP example

Use `.mcp/resend.email.example.json` as the repo-safe template. Copy it into local/private config and replace only in the private copy.

## Release checklist

- [ ] Verify `mail.sekretbip.com` or `sekretbip.com` in Resend DNS.
- [ ] Create a production Resend API key.
- [ ] Store `RESEND_API_KEY` in Supabase Edge Function secrets.
- [ ] Store `PARENT_INVITE_FROM_EMAIL` in Supabase Edge Function secrets.
- [ ] Deploy reviewed `parent-link-create` through the approved Supabase release lane.
- [ ] Smoke test teen code creation.
- [ ] Smoke test parent code redemption.
- [ ] Smoke test optional invite email delivery.
- [ ] Confirm email failure does not block manual code display.
- [ ] Record deploy SHA, Supabase function version, and smoke evidence in Founder Control Room #62.

## Safety boundaries

- No service-role key in client code.
- No real Resend API key in this repository.
- No private teen content in invite emails.
- No invite codes in runtime logs.
- No automated sending from GitHub Actions.
- No production deploy from documentation-only PRs.
