# sealos frontend

## Development setup

- It's recommended using this directory (`/frontend`) as root for your workspace.
- We use `pnpm` for package management, you should have it installed before getting started. ([Tutorial](https://pnpm.io/installation))
- Desktop app is under `desktop/` directory, sub apps are under `providers/<package>/`.

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
pnpm dev-app        # applaunchpad
pnpm dev-db         # dbprovider
pnpm dev-cost       # costcenter
pnpm dev-terminal   # terminal
pnpm dev-template   # template
pnpm dev-cronjob    # cronjob
pnpm dev-devbox     # devbox

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
2. deploy/cloud/init.sh
3. deploy/cloud/scripts/init.sh
4. frontend/providers/app/deploy/manifests/appcr.yaml.tmpl
5. frontend/providers/app/deploy/manifests/deploy.yaml
6. frontend/providers/app/deploy/manifests/ingress.yaml.tmpl
7. makefile

## multiple namespaces

In order to support multiple namespaces, the method of obtaining 'namespace' in the
backend should be replaced with the method of obtaining it from 'kubeconfig' instead
of adding 'ns-' to 'user' for generation purpose.
