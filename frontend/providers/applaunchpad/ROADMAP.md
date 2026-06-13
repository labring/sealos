# Roadmap

This file captures near-term product and engineering priorities for App Launchpad. It is not a release promise; use it to decide what deserves attention first.

## Current Focus

- Keep create and edit flows aligned across UI form state, YAML adaptation, legacy v1/v1alpha APIs, and v2alpha APIs.
- Improve user-visible clarity for Kubernetes and admission-webhook failures, especially public-domain conflicts, quota, permission, image, and readiness errors.
- Make local development against test clusters repeatable through ignored local env/config files and Codex runner actions.

## Near-Term Priorities

1. Strengthen public-domain and networking workflows.
   Keep prefix validation, conflict detection, generated ingress YAML, and admission-webhook fallback behavior in sync.

2. Harden image-derived defaults.
   Continue treating registry-derived exposed ports as safe defaults with stale-response guards, not as a source that should overwrite manual edits.

3. Keep API schema parity.
   When a field changes in app shape, update `src/types/request_schema.ts`, `src/types/v2alpha/request_schema.ts`, OpenAPI examples, UI adapters, and backend handlers together.

4. Improve operational feedback loops.
   Logs, monitor data, pod state, events, and error explanations should help users decide what to do next without raw cluster spelunking.

5. Maintain reliable local cluster workflows.
   The 209 runner flow should stay green or be updated whenever config, service names, or local port assumptions change.

## Watch List

- `data/config.yaml.local` and `.env.local` contain local cluster details and must remain ignored.
- API changes can affect external clients, not only the React UI.
- `deploy/` chart defaults and runtime `data/config.yaml` shape must stay compatible with `src/instrumentation.ts`.
- Public-domain reserved prefixes are deployment policy, not hardcoded product constants; keep `launchpad.publicDomain.reservedPrefixes` optional and default-empty unless an environment config says otherwise.
