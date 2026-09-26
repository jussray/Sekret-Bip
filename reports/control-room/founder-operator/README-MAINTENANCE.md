# README Maintenance Gate

Founder Control Room treats the root `README.md` as a public repository contract, not a passive summary.

For every merged product, security, operations, deployment, or verification change, the active writer must record one of two outcomes:

1. `README updated` with the PR or commit that changed it; or
2. `README reviewed — no change required` with a short reason.

The review must check:

- current implementation and launch posture;
- user-visible behavior and failure recovery;
- validation commands and production verification;
- privacy, consent, authorization, and mutation boundaries;
- whether hosted evidence is blocked by infrastructure rather than code.

A README update never substitutes for implementation evidence, tests, release proof, or Founder approval. It only keeps the repository entrance aligned with current truth.
