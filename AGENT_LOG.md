# AGENT_LOG.md
# Se'kret Bip — Append-Only Agent Feedback Log
#
# PURPOSE
# Agents write to this file after every significant action.
# Future agents read this file before acting.
# This closes the OODA loop by giving agents memory of past decisions.
#
# RULES
# - Append only. Never delete or edit past entries.
# - No secrets, tokens, keys, or private user data. Ever.
# - No file paths to private content or internal URLs.
# - One entry per meaningful action or correction.
# - Be specific about what was wrong — vague entries have no value.
#
# FORMAT
# ---
# DATE: YYYY-MM-DD
# AGENT: [agent name or "human"]
# TRACK: [Control Room OS | Bip Room UI | Shared]
# ACTION: [one sentence — what was done]
# WHY: [one sentence — why this was the right move]
# WRONG: [one sentence — what assumption was incorrect, or "none"]
# PRESERVED: [what existing work was kept intact]
# REMAINS: [what is still unfinished, if anything]
# ---

---
DATE: 2026-07-07
AGENT: Perplexity (external AI assistant)
TRACK: Control Room OS
ACTION: Created AGENT_LOG.md at repo root as an append-only agent feedback file.
WHY: The OODA loop in AGENTS.md had no feedback mechanism — agents acted but had no way to record corrections for future agents. This file closes that loop.
WRONG: In prior session, "Control Room OS" and "Bip Room UI" were conflated into a single mental bucket called "control room." These are two distinct tracks and must never be merged.
PRESERVED: All existing files untouched. This is a purely additive change.
REMAINS: Item 2 (Supabase → Worker → AI reply contract test) and Item 3 (Raylene room hotspot extraction) are queued but not yet started.
---

---
## TRACK DEFINITIONS (locked — do not change without human approval)

### Control Room OS
The founder operating system that builds and operates Bip.
Scope: missions, workers, connectors, local agent behavior, fallback logic, OODA loop infrastructure.
Location: repo root, .agents/, worker/, AGENTS.md, CLAUDE.md, this file.

### Bip Room UI
The in-app teen room experience inside the Bip product.
Scope: room backgrounds, hotspots, stickers, characters, room serialization, RoomScreen.tsx.
Location: assets/, screens/RoomScreen.tsx, ROOM_ASSET_MAP.md.

### Rule
One is the workshop. One is the product.
An agent working on Control Room OS does not touch Bip Room UI files, and vice versa, unless the task explicitly crosses tracks and a human has confirmed the crossing.
---

---
DATE: 2026-07-07
AGENT: GPT-5.5
TRACK: Control Room OS
ACTION: Added a Supabase to Cloudflare Worker AI reply contract test with explicit skip behavior and a named npm script.
WHY: This is the smallest test-only guard for the Supabase write/read seam, Worker request boundary, and reply-shaped response without touching product UI or production behavior.
WRONG: none
PRESERVED: Existing Worker, Supabase schema, app routes, assets, screens, and Room UI files were left unchanged; paid AI remains opt-in through test env configuration.
REMAINS: The live contract path still requires Control Room operators to provide safe environment variables and choose fallback, fixture, or paid Worker mode before it will run.
---
