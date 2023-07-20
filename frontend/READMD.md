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

- dev your app

```bash
cd frontend
make dev-[app path, such as providers/costcenter, desktop, etc.]
```

- add packages

```bash
cd frontend
# add remote
pnpm --filter=[project name or path] -r add \[package name\] 
# add local
pnpm --filter=[project name or path] -r --offline add \[package name\] 

```

## how to build

```bash
cd frontend
make image-build-[app path, such as providers/costcenter, desktop, etc.]
# multi jobs build
make all -j
```

- you can use `make all DOCKER_USERNAME=your_account` to build all apps for your account.

## new App

Refer to other apps to add some configuration.

1. .github/workflows/frontend.yml
2. deploy/cloud/init.sh
3. deploy/cloud/scripts/init.sh
4. frontend/providers/app/deploy/manifests/appcr.yaml.tmpl
5. frontend/providers/app/deploy/manifests/deploy.yaml
6. frontend/providers/app/deploy/manifests/ingress.yaml.tmpl
7. makefile
