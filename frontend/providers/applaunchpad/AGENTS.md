# App Launchpad Agent Notes

This provider lives at `$HOME/labring/sealos/frontend/providers/applaunchpad` inside the larger Sealos frontend workspace.

## Project Shape

- Next.js pages-router app for Sealos App Launchpad.
- Product routes live in `src/pages/apps.tsx`, `src/pages/app/edit/`, and `src/pages/app/detail/`.
- Next API routes live in `src/pages/api/`, including legacy app APIs, v1/v1alpha surfaces, v2alpha surfaces, monitor/log routes, platform helpers, and OpenAPI routes.
- Server-side Kubernetes helpers live under `src/services/backend/`.
- Form/YAML/API adaptation lives mostly in `src/utils/adapt.ts`, `src/utils/deployYaml2Json.ts`, `src/types/`, and `src/types/v2alpha/`.
- Runtime config is loaded by `src/instrumentation.ts` from `data/config.yaml.local` in development and `/app/data/config.yaml` in production.

## Local Development

Use the Codex runner action when possible:

```bash
yq -r '.actions[0].command' .codex/environments/environment.toml | bash
```

The runner targets cluster 209 through `~/.kube/209`, refreshes `.env.local` from `User/${APPLAUNCHPAD_DEV_USER:-admin}.status.kubeConfig`, refreshes `data/config.yaml.local` from `applaunchpad-frontend-config`, rewrites dependent service URLs to local ports, and starts:

- `sealos/launchpad-monitor` on `127.0.0.1:8428`
- `sealos/service-vlogs` on `127.0.0.1:8429`
- `account-system/account-service` on `127.0.0.1:2333`
- `pnpm run dev` for the Next.js app

The default `admin` user points at `ns-admin`, where the cluster 209 sample Launchpad apps live. To test another namespace, start the runner with `APPLAUNCHPAD_DEV_USER=<user>`.

The runner sets `NODE_OPTIONS=--no-experimental-global-navigator` because Node 24 exposes a global `navigator` without `window`. `echarts@5.4.3` treats that as a browser-like environment during SSR and can throw `ReferenceError: window is not defined` unless the experimental navigator is disabled.

`.env.local` and `data/config.yaml.local` are intentionally ignored because they can contain kubeconfig, tokens, and cluster service secrets.

## Verification

Prefer targeted verification for the changed surface:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm run lint
git diff --check
```

For repo-root workspace commands:

```bash
pnpm --filter ./providers/applaunchpad exec tsc --noEmit --pretty false
pnpm --filter ./providers/applaunchpad lint
```

For runner changes, also validate:

```bash
yq -o=json '.version, .name, .actions[0].name, .actions[0].icon' .codex/environments/environment.toml
kubectl --kubeconfig ~/.kube/209 -n sealos get svc launchpad-monitor service-vlogs
kubectl --kubeconfig ~/.kube/209 -n account-system get svc account-service
kubectl --kubeconfig ~/.kube/209 get user "${APPLAUNCHPAD_DEV_USER:-admin}"
NODE_OPTIONS=--no-experimental-global-navigator node -e "require('echarts'); console.log('echarts ok')"
```

Then run a bounded smoke test and wait for `✓ Ready` from Next.js.

## Product Rules

- Keep form, YAML, backend handlers, shared schemas, and OpenAPI surfaces aligned when app shape or validation changes.
- Do not treat cluster-side admission checks as redundant with app-side prechecks. They are complementary and should produce clear user-facing errors where matchers exist.
- Public-domain prefix behavior is user-visible. Preserve normalization, reserved-prefix checks, conflict handling, and suffix/domain handling across create, update, apply, and API paths.
- Image-derived exposed ports are defaults. Guard async updates so slower image lookups cannot overwrite later manual user edits.

## Safety

- Do not run database writes or production mutations unless the user explicitly asks.
- Do not commit ignored local env/config files.
- Do not add secrets, kubeconfigs, registry tokens, or cluster service secrets to tracked docs or runner files.
- Avoid destructive git commands. Preserve unrelated user work in shared worktrees.
