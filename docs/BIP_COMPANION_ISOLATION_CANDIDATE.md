# Isolated bip Worker — source preparation only

This branch contains an explicit Wrangler target and a standalone entry at
`worker/companion-entry.ts`. Both are intentionally closed and **not a
functional AI companion**.

- `workers_dev = false` and `preview_urls = false`.
- No routes, service bindings, environment values, broad database access,
  inbound email, Bridge logic, or payment/management abilities.
- The entry responds 404 for every non-companion path and 503 for companion
  methods until an approved replacement is implemented.
- There is deliberately **no `deploy:bip` script**. The read-only branch
  authority verifier must keep the existing live `bip` trigger blocked.
- Do not alter `api.sekretbip.net` routing or backend secrets.

Before enabling a deployment script or service binding, independently prove
authentication, safety, style/voice parity, rate limits, telemetry privacy,
Service Binding ownership, backend release identity, exact source SHA, and
both positive and negative companion journeys. Confirm that no privileged
service-role access or Bridge data crosses the boundary. Preserve backend-local
companions as a rollback path until a separately approved cutover.
