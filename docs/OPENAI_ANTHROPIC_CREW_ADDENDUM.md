# OpenAI + Anthropic Crew Addendum

Status: **applies to the Founder Preview handoff and supersedes its older Crew sample paragraph**

Primary product contract: `docs/UNLIMITED_CREW_IDENTITY_PRIVACY.md`

## Binding Crew rule

There is no numeric Crew cap and no ten-recipient check-in cap.

Unlimited membership does not bypass:

- permanent account authentication;
- accepted Bip-ID relationships;
- no-self rules;
- blocked and removed states;
- deliberate per-recipient sharing;
- Supabase Row Level Security;
- owner and participant revocation rights.

## Identity boundary

All accounts remain anonymous to other users by default.

| State | Identity visible to another account |
|---|---|
| Stranger | Public anonymous nickname/avatar only |
| Pending invite | Anonymous account and Bip invite/status only |
| Accepted Crew | Private display name may appear inside Crew only |
| Blocked or removed | No trusted name; no Crew content access |

Public Circle remains anonymous after Crew acceptance.

The accepted-only identity resolver is:

```text
get_crew_connection_profiles(uuid[])
```

OpenAI, Codex, Anthropic, and Claude agents must not replace it with:

- `get_public_circle_profiles` for Crew identity;
- direct `circle_profiles` reads;
- direct cross-user `app_profiles` reads;
- email lookup;
- caller-supplied names;
- a local client flag that pretends a relationship is accepted.

`redeem_crew_invite` retains `p_first_name` only for compatibility. The database ignores that input and resolves identity from the completed account profile after acceptance.

## Unlimited check-in boundary

The canonical write path is:

```text
create_crew_check_in(date, emoji, note, uuid[])
```

The database deduplicates the array and validates every recipient before writing. One self, stranger, pending, removed, or blocked recipient fails the entire transaction.

Do not restore client-side loops that insert a check-in first and shares afterward. That permits partial success and violates the Crew standard.

## Leave and block

Either participant may call:

```text
set_crew_connection_status(other_user_id, blocked | removed)
```

The database immediately revokes trusted identity, active check-in shares, and legacy membership access.

## Founder Preview behavior

When no real accepted Crew exists, Founder Preview may display labeled local sample profiles and check-ins. Sample actions must remain React state only and must not create accounts, relationships, memberships, check-ins, shares, or encouragements in Supabase.

## Provider boundary

Claude Code as a coding agent and Anthropic as a runtime provider are separate decisions. This Crew contract does not authorize sending Crew identities or check-in content to any model provider.

OpenAI and Anthropic runtime use must remain server-side, purpose-limited, reviewed, authenticated, and data-minimized. No provider is needed for Crew membership, identity resolution, check-in sharing, blocking, removal, or encouragement presets.
