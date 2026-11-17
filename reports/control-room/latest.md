# Bip Control Room — local report

Generated: 2026-07-10T03:40:16.104Z

Status: **GREEN**
Score: **100%**
Push safe: **yes**
Demo ready: **yes**

| Area | Check | Status | Duration | Command |
| --- | --- | --- | ---: | --- |
| app | Runtime assets | ✅ pass | 313ms | `npm run audit:runtime-assets` |
| control-room | Control Room structure | ✅ pass | 221ms | `npm run audit:control-room:structure` |
| supabase | Supabase RLS scan | ✅ pass | 277ms | `npm run audit:control-room:rls` |
| companions | Companion assets | ✅ pass | 298ms | `npm run validate:companions` |
| code-quality | TypeScript | ✅ pass | 21894ms | `npm run type-check` |
| code-quality | Lint | ✅ pass | 8353ms | `npm run lint` |
| tests | Unit tests | ✅ pass | 3386ms | `npm test` |
| voice | Voice intelligence | ✅ pass | 4360ms | `npm run test:voice-intelligence` |
| oracle | Oracle discovery | ✅ pass | 3227ms | `npm run test:oracle` |
| assets | Room archives | ✅ pass | 1334ms | `npm run verify:room-archives` |

## Guardrails
- No GitHub PAT is required or read by this script.
- No OpenAI key is required or read by this script.
- Do not run fixture audits on real teen private content.
- Use GitHub Actions only as a release/PR backup while minutes are constrained.
