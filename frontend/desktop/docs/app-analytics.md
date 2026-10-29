# Native App analytics — phase 1

This phase makes existing App events usable in China (the existing controlled
Rybbit transport) and Global (Main → Desktop API → GA4 Measurement Protocol).
It adds no database tables, migrations, durable event queue, scheduled worker,
website visitor handoff, OAuth changes, billing producer or deployment proof.
The complete attribution drafts are separate follow-up work.

## Ownership and contract

```text
App Main owns Cloud, installation ID, session and detailed-statistics setting
  China  → existing Rybbit proxy
  Global → POST /api/analytics/events → GA4 Web stream /mp/collect
                      server owns MP secret and verifies optional OAuth identity
```

The native POST contract is version 1, surface `desktop_app`, edition `global`,
an event UUID/time, installation ID, optional session ID, analytics permission,
detailed flag and allowlisted event/properties. No caller-selected destination,
client `user_id`, email, local path or website attribution payload is accepted.
The event list covers launch/first open, screen, login, task and client-observed
`deploy_finished`; it cannot assert signup, payment or trusted deployment success.

Detailed events map the random App installation to a stable GA4 `client_id`.
A verified native OAuth access token supplies GA4 `user_id` (`sub`); Workspace
is a separate event dimension. Anonymous pre-login events need no access token.
An invalid supplied token is rejected, never silently accepted anonymously.
With detailed statistics off, the server creates a fresh event identifier and
omits user ID, session, Workspace and engagement fields; task events are rejected.
Explicit analytics denial results in no outbound request. This preserves the
App's existing basic-versus-detailed collection policy.

The API accepts only native calls without Origin and JSON bodies up to 8 KiB.
It uses bounded per-process minute rate limits, not the OAuth database limiter.
These are best effort across replicas; configure gateway abuse limits for public
traffic. Client IP is used only for the short-lived local limit and is not sent
to Google. Only the fixed Google HTTPS endpoint is contacted, with redirects
disabled and a five-second timeout. No request headers or secrets are reflected.

Success is `{ accepted: true, event_id }` after upstream HTTP 2xx. It means
transport acceptance, not proof that GA4 reports contain the event. Failures are
returned to the App's existing bounded memory queue. No persistent deduplication
or exactly-once delivery is claimed: offline/exit can lose events and lost
acknowledgements can cause duplicates. Nothing here changes login/deployment.

## Configuration and rollout

Disabled by default. On the Global Desktop deployment only, set:

- `APP_ANALYTICS_REALM=global` (China and missing/invalid values stay disabled).
- `GOOGLE_ANALYTICS_MEASUREMENT_ID` for a GA4 **Web** stream.
- `GOOGLE_ANALYTICS_MP_API_SECRET` for that stream; server Secret only.
- Optional `APP_ANALYTICS_NATIVE_CLIENT_IDS`: comma-separated native OAuth
  client allowlist; defaults to `sealos-io`.

The existing Helm chart exposes `appAnalytics.enabled` and
`appAnalytics.existingSecret`. The referenced Secret contains the two Google
keys above (and optional client allowlist); the chart sets the realm explicitly.
Do not place API secrets in App bundles, public config, Git or Helm values.
No acquisition flags, migrations or flush schedule are required. Deploy this
endpoint before releasing the matching App change. China retains existing
Rybbit deployment/configuration. No website or Brain PR is required.

## Acceptance

Run unit HTTP/protocol tests, Desktop TypeScript checking, and Helm rendering.
In the App exercise production `file://`, China/Global separation, logged-out
then logged-in identity, Workspace/account/Cloud switching, detailed opt-out,
retry/timeout and missing endpoint. Confirm actual test events in the intended
Rybbit/GA4 destination using authorized production configuration before rollout.
Configure GA4 User-ID reporting and any desired custom event dimensions.

MP bypasses the Web GTM container: it does not trigger its Google Ads, Reddit,
LinkedIn or Twitter tags. It does not join website client IDs or recreate all
automatic Web/session/acquisition reports. These are phase-2 topics; sGTM can
later replace the server transport behind the same native event contract.

Official references: [MP reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference),
[validation](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events).
Google HTTP 2xx alone is not report validation; the debug validation endpoint
also does not collect events or verify the API secret.
