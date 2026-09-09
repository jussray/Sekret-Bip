# Resend MCP for onboarding agents

This repository enables the hosted Resend MCP server for OpenCode through `opencode.json`.

## Authenticate

Run locally from the repository:

```bash
opencode mcp auth resend
opencode mcp list
```

OpenCode stores OAuth credentials outside the repository. Never commit Resend API keys, OAuth tokens, Supabase service-role keys, invite codes, or private teen/parent content.

## Intended use

Agents may use Resend MCP to support the parent/trusted-adult onboarding email path by:

- inspecting sender-domain verification and request logs;
- drafting or reviewing minimal invite templates;
- checking delivery status and failures;
- validating that email failure preserves the manual invite-code path.

## Production boundary

MCP access does not configure the application runtime. Production delivery still requires the approved Supabase Edge Function release lane and these Supabase secrets:

```txt
RESEND_API_KEY=<stored only in Supabase secrets>
PARENT_INVITE_FROM_EMAIL=Se'kret Bip <invite@mail.sekretbip.com>
```

Do not send a live onboarding email, mutate contacts, publish templates, change domains, rotate keys, deploy functions, or alter production data without founder approval and recorded Control Room evidence.

Invite content must remain minimal and must not expose private teen content.
