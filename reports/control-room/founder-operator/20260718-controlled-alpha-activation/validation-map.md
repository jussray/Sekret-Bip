# Controlled-Alpha Validation Map

```mermaid
flowchart LR
    A[Live baseline: 2 of 12] --> B[Rollback rehearsal]
    B --> C[Boundary slice: platform-blocked]
    B --> D[Crew access slice: passed and rolled back]
    B --> E[Bridge hardening slice: passed and rolled back]
    C --> F[Full verification remains open]
    D --> G[No persistent change]
    E --> G
    G --> H[Production unchanged]
    F --> I[Next: isolated full rehearsal]
    H --> I
    I --> J[Founder review before any live action]
```

## Status board

| Area | Status |
|---|---|
| Live catalog | 2 of 12, expected before migration |
| Boundary slice | Platform-blocked before execution |
| Crew access slice | Passed inside rollback |
| Bridge hardening slice | Passed inside rollback |
| Combined rehearsal | Not executed |
| Persistent production changes | Zero |
| PR #495 | Draft and mergeable |

## Decision line

Safe preparation and evidence work may continue. Permanent database changes, merge, deployment, accounts, builds, and distribution remain held until a complete isolated rehearsal passes and the founder gives the separate approval.
