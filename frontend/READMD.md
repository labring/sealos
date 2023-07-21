# sealos frontend

## prepare auto script

```bash
cd /sealos # Make sure you are in the sealos root directory
sh frontend/scripts/initFormat.sh
```

## prepare dev host

```bash
# dev
echo '35.220.145.199 apiserver.cluster.local' | sudo tee -a /etc/hosts
# io
echo '35.240.227.100 apiserver.cluster.local' | sudo tee -a /etc/hosts
# cn
echo '121.41.82.246 apiserver.cluster.local' | sudo tee -a /etc/hosts
```

## how to dev

- It is best to use `sealos/frontend` as the workspace directory to develop applications.
- Before dev, you should install `pnpm` first. [pnpm](https://pnpm.io/zh/)
- The `sealos/frontend/packages/*` are local dependencies, you need run `pnpm -r --filter=./packages/* run build` in the `sealos/frontend` directory tobuild them.
- The `sealos/frontend/providers/*` are sub applications..
- The `sealos/frontend/desktop` is desktop app.

- add packages

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
make image-build-<app> DOCKER_USERNAME=your_account
# such as:
# make image-build-providers/costcenter
# make image-build-desktop

# multi jobs build
make -j
```

- you can use `make all DOCKER_USERNAME=your_account` to build all apps for your account.

## how to publish image

```bash
# sealos/frontend
make image-push-<app> DOCKER_USERNAME=your_account
# such as:
# make image-push-providers/costcenter
# make image-push-desktop

# publish all
make push-images DOCKER_USERNAME=your_account
```

## new App

Refer to other apps to add some configuration.

1. .github/workflows/frontend.yml
2. deploy/cloud/init.sh
3. deploy/cloud/scripts/init.sh
4. frontend/providers/app/deploy/manifests/appcr.yaml.tmpl
5. frontend/providers/app/deploy/manifests/deploy.yaml
6. frontend/providers/app/deploy/manifests/ingress.yaml.tmpl
7. makefile
