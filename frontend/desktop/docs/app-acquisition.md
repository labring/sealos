# App acquisition and overseas analytics (phase 1)

Tracks labring/sealox#581 and #584. Phase 1 uses the existing native OAuth flow
and a server-owned MP adapter; phase 2 can replace that adapter with sGTM without
changing native event or identity contracts. No browser GTM tag is executed by MP.

## Ownership and sequence

1. Main chooses China/Global and owns installation, session and collection permission. The server maps installation IDs
   deterministically to GA4 decimal.decimal client IDs; raw UUIDs are not MP client IDs.
2. OAuth creates its existing PKCE request and browser cookie. An optional ten-minute
   capability sends that browser to the allowed original website `/app-attribution`.
3. The website posts its own origin context, then navigates to the fixed OAuth
   continuation. The continuation checks the original browser cookie. The capability
   only attaches attribution; it cannot approve an account or change a redirect URI.
4. Successful code exchange commits the existing authentication transaction first.
   Attribution then independently appends an immutable account/installation/journey
   record. Attribution failure is observable and cannot roll back a successful login.
5. An explicit download/open-App capability may be redeemed once for an installation
   token, then bound to one OAuth attempt. Unknown origins, invalid/replayed/expired
   capabilities never create a successful account association.
6. Native events go through Main to `/api/analytics/events`. Authenticated identity
   comes only from a verified native OAuth access token. Client payment/signup claims
   are rejected. Trusted lifecycle facts use `/api/analytics/lifecycle`.

The database owns capabilities, immutable identity links and the analytics outbox.
OAuth owns state/PKCE/browser authentication. No local process cache is authoritative.
First and later account journeys remain separate records; do not rewrite an entire
shared installation's history to the most recently logged-in account.

## Configuration

- `ACQUISITION_REALM`: explicitly `china` or `global`; absent disables the new feature.
- `ACQUISITION_WEBSITE_ORIGINS`: optional comma-separated HTTPS origins, restricted
  to the selected realm's sealos.io or sealos.run root/www origins.
- `ACQUISITION_INGEST_SECRET`: service-to-service subject lookup, lifecycle and outbox
  flush secret. Keep it out of browser/native bundles and access logs.
- `GOOGLE_ANALYTICS_MEASUREMENT_ID`, `GOOGLE_ANALYTICS_MP_API_SECRET`: Global MP
  destination and secret. The existing Web destination is G-YF5VHZSTE0; configure it
  explicitly after verifying the property's access. GTM read-only OAuth is unrelated.
- `ACQUISITION_RYBBIT_ORIGIN`, `ACQUISITION_RYBBIT_SITE_ID`,
  `ACQUISITION_RYBBIT_API_KEY`: China trusted lifecycle transport. Uses the server
  tracking API and canonical `china:<userUid>` identity; properties are JSON strings.
  See [Rybbit sending events](https://rybbit.com/docs/api/sending-events).
- Existing marketing consent signing configuration supplies Brain's short-lived,
  raw-sea_attr-hash-bound receipt. Browser ad claims are not elevated to verified
  consent: signed ad consent remains unspecified until a trusted receipt is wired.

POST `/api/analytics/flush` with the ingest secret to drain pending/expired leases;
schedule this endpoint from the deployment scheduler. Requests insert before sending.
The Desktop Helm chart includes the opt-in scheduler: enable `acquisition.enabled`,
choose `acquisition.realm` and provide `acquisition.existingSecret` containing the
environment keys above. Its default-disabled job uses a separate ServiceAccount,
no Kubernetes API token, and an explicit Cilium ingress exception when enabled.
Delivery failures remain pending, with a bounded lease and attempts; transport failure
does not affect login or billing. GA4 does not promise universal event_id deduplication:
acknowledgement-loss delivery is at-least-once, transaction IDs protect revenue facts,
and operational reconciliation must not claim exactly-once GA custom event delivery.
Trusted facts received before an eligible link remain durable and are not dispatched
without one. Signup is generated only when the server-created account timestamp lies
inside the successful OAuth journey; repeat login cannot generate signup.

## Verification and release

Run protocol, HTTP and OAuth regression tests. Exercise real anonymous website →
download → App → browser authorization → exchange; query the persisted journey, and
query the same test event in GA4. Test denial, wrong origin, replay, account switching,
cross-realm rejection and unavailable collector. Validation server acceptance and HTTP
2xx alone are insufficient. Configure GA dedicated User-ID on Web and a reporting
identity supporting it. MP-only collection does not supply every automatic measurement
or standard acquisition report; custom source data stays independently queryable.

Deploy both provider-specific global migrations before enabling these endpoints.
Production credentials, actual consent receipts and real platform verification are
release prerequisites, not bundled credentials or claims of completed deployment.

## Cross-repository review and remaining acceptance

- [App](https://github.com/labring/sealox/pull/588): Main routing, identity/session,
  installation handoff and native OAuth. Its `deploy_finished` is a client observation.
- [Domestic website](https://github.com/labring/sealos.run/pull/29) and
  [overseas website](https://github.com/labring/sealos.io/pull/360): original-origin
  visitor context, download continuation and explicit analytics choice.
- [Brain](https://github.com/labring/brain/pull/364): pre-deployment account snapshot,
  trusted Brain deployment facts and durable forwarding.
- This repository: OAuth association, verified identity, consent-safe snapshot,
  collector, migrations, sink routing and committed billing fact publisher.

Backend migrations/configuration should precede the new clients. Enable both realms
with separate sink credentials, align Brain's receipt signing key, then run the two
real cross-repository journeys. The synthetic website fixtures and App wire tests
verify protocol compatibility; they are not a production end-to-end result.

The native deployment producer is implemented in this PR and App #588. Rust registers
workload references through Main before applying; Main keeps the OAuth credential and
contacts the resource region. The server records before snapshots, requires a scoped
operation marker and real desired changes, then independently verifies readiness before
atomically claiming receipts and creating deploy_success. See
[native deployment proof](native-deployment-attribution.md) for the supported workload
schemas, current-generation checks, leases and limitations. Client deploy_finished
remains a behavior event and never becomes a trusted success by renaming it.

Unknown workload kinds, unverifiable bucket controllers and plans over ten proof
resources do not produce partial trusted successes. Production acceptance still needs
actual cluster RBAC/controller behavior, the two real cross-repository journeys and
real GA4 collection/report queries; sGTM remains phase 2.

On 2026-10-29, Google's real `/debug/mp/collect` strict validator accepted a
synthetic native screen and server payment payload with no validation messages after
mapping the install ID to decimal.decimal. The debug call used a placeholder secret,
which the validation endpoint does not verify, and did not deliver events to reports.
This validates the protocol shape only; the real destination secret, collection and
reporting identity still require production acceptance.
