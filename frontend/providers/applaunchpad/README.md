# Sealos App Launchpad

App Launchpad is the Sealos provider for creating, updating, observing, and operating user applications on a Kubernetes cluster. It is a Next.js app that combines the product UI, Next API routes, OpenAPI surfaces, and Kubernetes YAML adaptation logic for the Launchpad experience.

The provider is normally embedded in Sealos Desktop. For local development, it can run standalone with a mocked user kubeconfig and selected cluster services exposed through port-forwarding.

## What It Does

- Lists user applications and keeps pod status plus lightweight monitoring data fresh.
- Creates and edits Deployment or StatefulSet based apps, including services, ingress, HPA, config maps, secrets, storage, GPU options, and YAML preview.
- Shows app detail, pods, events, logs, metrics, restart/start/pause actions, and file browser operations.
- Exposes legacy v1/v1alpha and v2alpha API routes for app lifecycle operations and OpenAPI documentation.
- Loads platform configuration from `data/config.yaml.local` in development and `/app/data/config.yaml` in production.

## Tech Stack

- Next.js 13.5 with the pages router
- React 18, Chakra UI, `@sealos/ui`, and `sealos-desktop-sdk`
- React Query, Zustand, React Hook Form, Zod/OpenAPI helpers
- `@kubernetes/client-node` for server-side cluster operations
- pnpm workspace packages from `$HOME/labring/sealos/frontend`

## Local Development

Install dependencies from the frontend workspace root when needed:

```bash
cd "$HOME/labring/sealos/frontend"
pnpm install
```

Run this provider directly:

```bash
cd "$HOME/labring/sealos/frontend/providers/applaunchpad"
pnpm run dev
```

For this remote host, the Codex environment action in `.codex/environments/environment.toml` is the easiest path. It refreshes local development config from cluster 209, starts the needed port-forwards, and runs `pnpm run dev`.

```bash
cd "$HOME/labring/sealos/frontend/providers/applaunchpad"
yq -r '.actions[0].command' .codex/environments/environment.toml | bash
```

The action creates or refreshes ignored local files:

- `.env.local` with `NEXT_PUBLIC_MOCK_USER` set to the cluster 209 user kubeconfig.
- `data/config.yaml.local` copied from `applaunchpad-frontend-config`, with monitor, log, and billing URLs rewritten to localhost port-forwards.

## Configuration

`NEXT_PUBLIC_MOCK_USER` must be a one-line kubeconfig string for development. The app uses it as the authorization source when it is not running inside Sealos Desktop.

`data/config.yaml.local` controls cloud domain, user domains, feature flags, pricing and monitoring service URLs, file limits, and Launchpad metadata. Production mounts the same shape at `/app/data/config.yaml`.

## Useful Commands

```bash
pnpm run dev
pnpm run build
pnpm run lint
pnpm exec tsc --noEmit --pretty false
```

From the frontend workspace root, provider-scoped commands can also be run with:

```bash
pnpm --filter ./providers/applaunchpad lint
pnpm --filter ./providers/applaunchpad exec tsc --noEmit --pretty false
```

## Project Map

- `src/pages/apps.tsx` is the app list.
- `src/pages/app/edit/` is the create and edit flow.
- `src/pages/app/detail/` is the detail, monitor, logs, pod, and advanced info surface.
- `src/pages/api/` contains Next API routes used by the UI and external clients.
- `src/services/backend/` contains auth, Kubernetes client, response, and public-domain helpers.
- `src/utils/deployYaml2Json.ts` and `src/utils/adapt.ts` convert between form state, YAML, and API responses.
- `src/types/`, `src/types/v2alpha/`, and `src/types/request_schema.ts` define API and form contracts.
- `deploy/` contains the chart, Kubefile, and production entrypoint material.

See `docs/runbook.md` for port-forward details and verification steps.
