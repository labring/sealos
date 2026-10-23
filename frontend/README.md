# sealos frontend

## Development setup

- It's recommended using this directory (`/frontend`) as root for your workspace.
- We use `pnpm` for package management, you should have it installed before getting started. ([Tutorial](https://pnpm.io/installation))
- Desktop app is under `desktop/` directory, sub apps are under `providers/<package>/`.

App Launchpad, Database (formerly DBProvider), and the Template app store are maintained in separate repositories:

- [App Launchpad](https://github.com/sealos-apps/applaunchpad)
- [Database](https://github.com/sealos-apps/database)
- [Template app store](https://github.com/sealos-apps/template)

Build and install these apps using their respective repositories. This repository's frontend builds and `scripts/cloud/install-v2.sh` no longer include them. Desktop retains their service URLs and integrations. The legacy Database and Launchpad monitoring services have been removed from this repository and its cloud installer; `service/vlogs` continues to provide logs for the extracted apps.

### Install dependencies

The post install script will run automatically, and local packages should be built.

```sh
pnpm install
```

### Generate Prisma clients for desktop app

```sh
cd desktop
pnpm gen:global && pnpm gen:region
```

### Prepare environment variables

`.env.template` files are located at the workspace root directory for each app. Duplicate and rename them to `.env`, then fill the required configurations.

`NEXT_PUBLIC_MOCK_USER` is the kubeconfig mocked for development, you can copy it from your Sealos desktop. (Only one line allowed, you should escape the line breaks)

### Run apps for development

You can either run apps in workspace root or in specific app's directory.

```sh
# Run desktop app
pnpm dev-desktop

# Run specific provider app
pnpm dev-cost       # costcenter
pnpm dev-license    # license

# or run dev script in app's package directory
cd desktop
pnpm dev
```

## how to add packages

```bash
cd frontend
# add remote
pnpm --filter=<path> -r add <package>
# such as:
# pnpm --filter=providers/costcenter -r add lodash
# pnpm --filter=desktop -r add lodash
# add local
pnpm --filter=<path> -r --offline add <package>
# such as:
# pnpm --filter=providers/costcenter -r --offline add sealos-desktop-sdk
# pnpm --filter=desktop -r --offline add sealos-desktop-sdk
```

## how to build

```bash
# sealos/frontend
make image-build-<app> DOCKER_USERNAME=<your_account> IMAGE_TAG=<tag>
# such as:
# make image-build-providers/costcenter
# make image-build-desktop
# make image-build-desktop IMAGE_TAG=test DOCKER_USERNAME=sealos
# multi jobs build
make -j
```

- you can use `make all DOCKER_USERNAME=<your_account>` to build all apps for your account.
- you can user `make all IMAGE_TAG=<tag>` to build all apps and customize tag (default:dev)

## how to publish image

```bash
# sealos/frontend
make image-push-<app> DOCKER_USERNAME=<your_account> IMAGE_TAG=<tag>
# such as:
# make image-push-providers/costcenter
# make image-push-desktop

# publish all
make push-images DOCKER_USERNAME=<your_account> IMAGE_TAG=<tag>
```

## new App

Refer to other apps to add some configuration.

1. .github/workflows/frontends.yml
2. frontend/providers/app/deploy/manifests/appcr.yaml.tmpl
3. frontend/providers/app/deploy/manifests/deploy.yaml
4. frontend/providers/app/deploy/manifests/ingress.yaml.tmpl
5. makefile

## multiple namespaces

In order to support multiple namespaces, the method of obtaining 'namespace' in the
backend should be replaced with the method of obtaining it from 'kubeconfig' instead
of adding 'ns-' to 'user' for generation purpose.

## Health probes

Desktop, Costcenter and License expose root `GET /healthz` (and `HEAD`). A ready
process returns HTTP 200; missing local configuration returns HTTP 503. Responses
are not cached. These routes require no user credentials and do not query databases,
Kubernetes, billing APIs or other external services. They are not business-health checks.

- Desktop checks `/app/data/config.yaml` in production, or `CONFIG_PATH` (default
  `data/config.local.yaml`) in development: cloud domain/region, database URI strings
  and internal/regional/global JWT keys must be present.
- Costcenter checks that instrumentation has installed its validated `__APP_CONFIG__`.
  It does not reload configuration or terminate the process from the health route.
- License requires nonempty `SEALOS_DOMAIN`, `LICENSE_DOMAIN` and `MONGODB_URI`.
  These existing variables are injected from chart configuration and the generated Secret.

All three charts expose `startupProbe`, `readinessProbe`, `livenessProbe` and
`tests.path` in both `values.yaml` and the installation `*-values.yaml`. Defaults:

| App | Startup (period / timeout / failures) | Readiness | Liveness |
| --- | --- | --- | --- |
| Desktop | 2s / 3s / 60 | delay 5s, period 3s, timeout 2s, successes 3, failures 3 | delay 15s, period 20s, timeout 1s, failures 3 |
| Costcenter | 2s / 3s / 30 | period 10s, timeout 3s, failures 6 | period 20s, timeout 3s, failures 3 |
| License | 5s / 5s / 30 | period 5s, timeout 5s, failures 3 | period 20s, timeout 5s, failures 3 |

Startup success enables readiness/liveness checks. Readiness gates Service traffic;
liveness failure restarts the container. Override the objects in the installation
values file or with Helm `-f` / `--set startupProbe.failureThreshold=90`. There are
no new probe environment variables. Keep the path `/healthz` and the container port
3000 unless changing the application's actual listener. `tests.image` defaults to
`busybox:1.36.1`; `tests.path` defaults to `/healthz`. Run `helm test <release> -n
<namespace> --logs` to check the Service endpoint.

Release the application image and updated chart together: older images do not have
`/healthz`. Roll back both image and probe configuration together. Existing Helm
releases with retained values must explicitly update their old probe paths. Desktop's
migration init container does not receive HTTP probes; do not run migrations as part
of health verification.

Run `node --test frontend/scripts/healthz.test.cjs` from the repository root for
isolated endpoint and local-configuration regression tests.
