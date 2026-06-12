# Runbook

## Prerequisites

- Work from `$HOME/labring/sealos/frontend/providers/applaunchpad`.
- Use pnpm from the frontend workspace.
- Cluster 209 kubeconfig must exist at `~/.kube/209`.
- `kubectl`, `node`, `pnpm`, and `yq` must be on PATH.

## Start Local Development Against Cluster 209

Use the Codex runner action:

```bash
yq -r '.actions[0].command' .codex/environments/environment.toml | bash
```

The runner:

1. Reads `User/${APPLAUNCHPAD_DEV_USER:-admin}.status.kubeConfig` from cluster 209 and writes `.env.local`.
2. Reads `applaunchpad-frontend-config` from cluster 209 and writes `data/config.yaml.local`.
3. Rewrites monitor, log, and billing URLs to localhost ports.
4. Starts port-forward processes:
   - `127.0.0.1:8428 -> sealos/launchpad-monitor:8428`
   - `127.0.0.1:8429 -> sealos/service-vlogs:8428`
   - `127.0.0.1:2333 -> account-system/account-service:2333`
5. Sets `NODE_OPTIONS=--no-experimental-global-navigator` for Node 24 compatibility with `echarts@5.4.3`.
6. Runs `pnpm run dev`.

The app should print:

```text
Next.js 13.5.9
Local: http://localhost:3000
Environments: .env.local
Ready
```

The default `admin` user points at `ns-admin`, which is the 209 namespace that currently contains the sample Launchpad apps. To test another namespace, start the runner with an explicit user:

```bash
APPLAUNCHPAD_DEV_USER=5jbcgjlg yq -r '.actions[0].command' .codex/environments/environment.toml | bash
```

## Manual Local Setup

Refresh local config from 209:

```bash
node <<'NODE'
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const yaml = require('js-yaml');

const kubeconfig = `${process.env.HOME}/.kube/209`;
const devUser = process.env.APPLAUNCHPAD_DEV_USER || 'admin';
function kubectl(args) {
  return execFileSync('kubectl', [...args, '--kubeconfig', kubeconfig], { encoding: 'utf8' });
}

const userKubeconfig = kubectl(['get', 'user', devUser, '-o', 'jsonpath={.status.kubeConfig}']);
fs.writeFileSync('.env.local', `NEXT_PUBLIC_MOCK_USER=${JSON.stringify(userKubeconfig)}\n`, { mode: 0o600 });

const cm = JSON.parse(
  kubectl(['-n', 'applaunchpad-frontend', 'get', 'cm', 'applaunchpad-frontend-config', '-o', 'json'])
);
const config = yaml.load(cm.data['config.yaml']);
config.launchpad.components.monitor.url = 'http://127.0.0.1:8428';
config.launchpad.components.log.url = 'http://127.0.0.1:8429';
config.launchpad.components.billing.url = 'http://127.0.0.1:2333';
fs.writeFileSync('data/config.yaml.local', yaml.dump(config, { lineWidth: 120 }), { mode: 0o600 });
NODE
```

Start port-forwards:

```bash
kubectl --kubeconfig ~/.kube/209 -n sealos port-forward --address 127.0.0.1 svc/launchpad-monitor 8428:8428
kubectl --kubeconfig ~/.kube/209 -n sealos port-forward --address 127.0.0.1 svc/service-vlogs 8429:8428
kubectl --kubeconfig ~/.kube/209 -n account-system port-forward --address 127.0.0.1 svc/account-service 2333:2333
```

Then run:

```bash
NODE_OPTIONS=--no-experimental-global-navigator NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm run dev
```

## Verification Commands

For most TypeScript/UI/API changes:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm run lint
git diff --check
```

From the frontend workspace root:

```bash
pnpm --filter ./providers/applaunchpad exec tsc --noEmit --pretty false
pnpm --filter ./providers/applaunchpad lint
```

For runner changes:

```bash
yq -o=json '.version, .name, .actions[0].name, .actions[0].icon' .codex/environments/environment.toml
git check-ignore -v .env.local data/config.yaml.local
kubectl --kubeconfig ~/.kube/209 -n sealos get svc launchpad-monitor service-vlogs
kubectl --kubeconfig ~/.kube/209 -n account-system get svc account-service
kubectl --kubeconfig ~/.kube/209 get user "${APPLAUNCHPAD_DEV_USER:-admin}"
NODE_OPTIONS=--no-experimental-global-navigator node -e "require('echarts'); console.log('echarts ok')"
```

Then run a bounded smoke test and confirm `✓ Ready`. If the runner is stopped with a timeout or Ctrl-C, the wrapper shell should clean up the port-forward processes it started.

## Build

```bash
pnpm run build
```

The Dockerfile builds a standalone Next.js runtime. Production config is mounted at `/app/data/config.yaml`.

## Troubleshooting

### `NEXT_PUBLIC_MOCK_USER` is missing

The app redirects to Desktop when it cannot get a session and no mock kubeconfig exists. Refresh `.env.local` from cluster 209 or run the Codex runner.

### Monitor or logs fail in local dev

Check that port-forwards are running and that `data/config.yaml.local` points to `127.0.0.1:8428` for monitor and `127.0.0.1:8429` for logs.

### Price or bonus endpoints fail in local dev

Check the billing port-forward on `127.0.0.1:2333` and the `launchpad.components.billing.url` field in `data/config.yaml.local`.

### Kubernetes API calls fail with authorization errors

Verify `NEXT_PUBLIC_MOCK_USER` parses as kubeconfig YAML and points to the intended user namespace.

### Public domain conflicts are unclear

Check app-side public-domain validation first, then cluster-side `vingress.sealos.io` admission webhook responses. Cross-namespace ownership conflicts may only be caught by the admission layer.

### `echarts` throws `window is not defined` during SSR

On Node 24, `navigator` can exist globally even though `window` does not. `echarts@5.4.3` uses `typeof navigator` in its environment detection and then reaches browser-only `window` checks. Start dev with `NODE_OPTIONS=--no-experimental-global-navigator` or use the Codex runner, which sets it automatically.
