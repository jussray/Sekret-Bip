# Open Browser Control Contract

## Purpose

The Se’kret Bip Control Room may use an available browser-control surface to inspect and operate web-only systems when no direct native connector exists.

## Fallback order

1. Use a direct provider connector when available.
2. Otherwise use an approved Open Browser, browser-control, computer-use, MCP, or equivalent UI-control connector.
3. Otherwise use a provider-held API bridge already configured for the workflow.
4. Otherwise provide exact manual steps and record the blocked path.

## Zapier and ChatGPT

When ChatGPT has no native Zapier connector, the approved bridge is the existing `@OpenAI Developers` / OpenAI Platform connection used by the preconfigured Founder Signal Engine workflow. The dedicated key reference is `zapier-founder-signal-engine`.

The raw key is never exposed. It authenticates the OpenAI action inside Zapier. It does not itself grant permission to inspect Zapier UI, edit Zap steps, publish content, write CRM records, change billing, rotate credentials, or delete evidence.

## Browser-control scope

An approved agent may open and inspect the named workflow, test non-destructive steps, repair mappings, verify connected accounts, and capture proof when the target and action are explicitly scoped and auditable.

Publication, outreach, CRM writes, billing, credential changes, account ownership changes, and deletion remain separate founder gates.

## Evidence required

Record the target, action, before state, after state, run ID, safe screenshots, rollback step, and blocked conditions. Browser access is not proof of a full pass. The full chain still requires GitHub evidence, Zapier run evidence, OpenAI 5W1H output, Buffer status, HubSpot association, and Founder Control Room evidence.
