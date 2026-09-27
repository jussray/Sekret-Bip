# MCP → Bip Skill Routing

MCP servers provide scoped tool channels. They do not automatically carry Se'kret Bip's product, privacy, auth, identity, database, Worker, or release rules.

The machine-readable source of truth is:

```text
config/mcp-skill-routing.json
```

Before an agent invokes a server it must load:

1. every skill in `alwaysLoad`;
2. every skill mapped to that server;
3. any feature skill triggered by the files or product surface being changed.

`npm run verify:mcp` fails when:

- a configured MCP server has no route;
- a mapped skill file is missing;
- a required high-risk mapping drifts;
- MCP authority broadens beyond the reviewed configuration;
- a credential appears in committed configuration.

## High-risk bindings

- GitHub → repository truth and release gates.
- Supabase → Supabase guardian, privacy redteam, and auth/onboarding.
- Playwright → auth/onboarding, privacy, beta, and release proof.
- Cloudflare Builds/Observability → Worker guardian and release evidence.
- Figma → companion style and visible Se'kret identity rules.

## Auth and onboarding

Any work involving splash, age gate, login, signup, email confirmation, consent, verification, parent linking, account restoration, or side routing must activate:

```text
bip-auth-onboarding
bip-repo-truth
bip-supabase-guardian
bip-privacy-redteam
bip-release-gate
```

The canonical auth/onboarding skill is:

```text
.agents/skills/bip-auth-onboarding/SKILL.md
```

A connected server is not implementation or release proof. Exact-head tests, migration parity, two-account isolation, and deployed user-journey evidence still decide truth.
