# MCP servers must activate their Bip skills

Before using any MCP server in this repository:

1. Read `config/mcp-skill-routing.json`.
2. Load every skill listed in `alwaysLoad`.
3. Load every skill mapped to the MCP server being used.
4. Follow the mapped authority boundary; MCP connectivity does not expand permissions.
5. Stop if a mapped skill file is missing or if `npm run verify:mcp` fails.

For login, signup, consent, verification, parent linking, account restore, or onboarding work, always load `.agents/skills/bip-auth-onboarding/SKILL.md` together with `bip-repo-truth`, `bip-supabase-guardian`, `bip-privacy-redteam`, and `bip-release-gate`.

Never treat an MCP response as proof that runtime behavior shipped. Exact repository state, tests, migration parity, deployment evidence, and synthetic user-journey proof remain required.
