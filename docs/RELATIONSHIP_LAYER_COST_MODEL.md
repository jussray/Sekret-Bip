# Relationship Layer Cost Model

Parent goal: #238  
Phase issue: #239

## Purpose and assumptions

This is a planning model, not a vendor quote. Actual pricing must be verified before launch. The model is designed to expose the cost drivers a solo founder must monitor.

Assumptions:

- Cloudflare Worker remains the AI/API gateway.
- Supabase provides auth, Postgres, and private storage.
- AI uses a small/efficient model for summaries, memory candidates, and recaps.
- No raw private content is retained in analytics.
- Email is optional and in-app delivery is the default.
- Usage is uneven; 25% of MAU are assumed weekly active on relationship features.

## Unit assumptions

| Operation | Planning assumption |
|---|---:|
| Bridge Summary | 1,500 input + 350 output tokens |
| Memory candidate | 600 input + 100 output tokens |
| Monthly recap | 2,500 input + 500 output tokens |
| Scrapbook media | average 8 MB stored per created memory |
| Active scrapbook user | 4 new media memories/month |
| Crew action | database/event operation, no AI by default |
| Email | one optional weekly parent email per participating pair |

Use current provider rates in deployment configuration; do not hard-code costs into product logic.

## Scenario model

### 100 MAU — invited founder beta

Expected monthly activity:

- 25 relationship-feature WAU
- 20 Bridge summaries
- 150 Crew check-ins/encouragements
- 60 scrapbook media memories
- 40 memory candidates
- 10 recaps

Planning budget:

| Cost area | Monthly range |
|---|---:|
| AI inference | $1–$5 |
| Supabase database/auth | free tier to $25 |
| Storage/egress | $1–$5 |
| Cloudflare | free tier to $5 |
| Optional email | $0–$3 |
| Monitoring/error tools | $0–$10 |
| Total | **$2–$53** |

Primary concern at this stage is not infrastructure cost; it is privacy correctness and founder support load.

### 1,000 MAU — monitored beta

Expected monthly activity:

- 250 relationship-feature WAU
- 300 Bridge summaries
- 3,000 Crew actions
- 1,000 scrapbook media memories
- 800 memory candidates
- 150 recaps

Planning budget:

| Cost area | Monthly range |
|---|---:|
| AI inference | $10–$45 |
| Supabase database/auth | $25–$75 |
| Storage/egress | $10–$40 |
| Cloudflare | $5–$25 |
| Optional email | $3–$15 |
| Monitoring/error tools | $10–$40 |
| Total | **$63–$240** |

At this stage, media storage and operational support can exceed AI cost. Signed-URL misuse and uncompressed uploads are material risks.

### 10,000 MAU — early production scale

Expected monthly activity:

- 2,500 relationship-feature WAU
- 4,000 Bridge summaries
- 40,000 Crew actions
- 15,000 scrapbook media memories
- 12,000 memory candidates
- 2,000 recaps

Planning budget:

| Cost area | Monthly range |
|---|---:|
| AI inference | $100–$450 |
| Supabase database/auth | $100–$500 |
| Storage/egress | $100–$600 |
| Cloudflare | $25–$150 |
| Optional email | $20–$100 |
| Monitoring/error tools | $40–$200 |
| Total | **$385–$2,000** |

The wide range reflects media size, retention, AI retries, database plan, and egress. Before reaching this tier, replace assumptions with measured per-feature unit economics.

## Cost controls by phase

### Bridge Summaries

- limit source count and total input characters;
- one generation per idempotency key;
- no automatic daily summaries;
- deterministic fallback during provider outage;
- cache generated summary rather than regenerate on parent view;
- log tokens, latency, retry count, and fallback flag without content.

### Crew Accountability

- no AI in MVP;
- bounded encouragement presets;
- batch/suppress notifications;
- rate-limit invites and encouragements;
- calculate streaks from canonical daily records instead of writing frequent counters.

### Emotional Scrapbook

- compress images before upload;
- cap image, audio size, and audio duration;
- create thumbnails;
- upload only after explicit save;
- delete abandoned uploads;
- define retention for archived/deleted media;
- alert on storage and egress per active user.

### Companion Memory

- propose memory only when a relevance threshold is met;
- do not embed every message;
- begin with structured/category retrieval before adding vectors;
- cap approved memories retrieved per turn;
- generate monthly recaps on demand or for recently active opt-in users only;
- delete rejected candidate payloads promptly.

## Metrics required before general availability

- AI cost per successful Bridge summary
- AI cost per approved memory candidate
- AI cost per saved recap
- storage GB per scrapbook-active user
- media egress per active user
- retry and malformed-output rate
- notification and email cost per engaged pair
- database rows written per Crew-active pair
- support hours per 100 active family/crew relationships

## Solo-founder release guardrails

- Keep all phases behind independent kill switches.
- Do not enable weekly email until in-app Bridge use proves valuable.
- Do not add vector infrastructure until approved-memory volume requires it.
- Do not allow unlimited audio or original-resolution photo storage.
- Pause rollout if feature-specific monthly cost exceeds the current revenue or test budget without clear retention evidence.
- Treat moderation, privacy support, deletion requests, and parent/teen disputes as real operating costs, even when infrastructure remains cheap.
