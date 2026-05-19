# Devbox Provider Runbook

## Local Setup

Start from the frontend workspace setup in `frontend/README.md`, then create a
provider env file:

```bash
cd /Users/mlhiter/labring/sealos/frontend/providers/devbox
cp .env.template .env.local
```

Set at least:

```bash
NEXT_PUBLIC_MOCK_USER='<kubeconfig JSON string>'
SEALOS_DOMAIN='192.168.10.70.nip.io'
INGRESS_DOMAIN='192.168.10.70.nip.io'
REGISTRY_ADDR='hub.192.168.10.70.nip.io'
JWT_SECRET='<desktop jwt secret>'
REGION_UID='<region uid>'
DATABASE_URL='<template database url>'
DATABASE_PROVIDER='cockroachdb'
```

Do not commit real `.env.*.local` secrets.

## Commands

```bash
pnpm dev
pnpm build
pnpm ts-lint
pnpm gen-client
pnpm migrate:deploy:cockroach
pnpm migrate:deploy:postgresql
```

There is no `test` script in `package.json` as of 2026-05-19. Use
`pnpm ts-lint` for focused type verification unless a task provides another test
command.

## Custom Domain Smoke Check

For a known invalid domain such as `adsf`, the custom domain drawer should show
a user-facing error:

```text
域名校验失败
未找到该域名，请确认域名填写正确并已完成 DNS 解析。
```

Expected mappings:

- `ENOTFOUND` -> domain not found
- `ENODATA` -> CNAME record missing
- CNAME mismatch -> DNS target mismatch
- challenge timeout -> timeout
- challenge network error -> network unreachable

A successful drawer validation only updates the form. The user must still click
the outer `变更` button to persist the network configuration.

## Cluster 70 Rollout Notes

Use the named kubeconfig and namespace:

```bash
export KUBECONFIG=/Users/mlhiter/.kube/70
kubectl -n devbox-frontend get deploy devbox-frontend
```

Default production/test-cloud image builds should be `linux/amd64`. The live
image is built from the monorepo root `frontend/Dockerfile`, not the provider
local Dockerfile:

```bash
cd /Users/mlhiter/labring/sealos/frontend
docker buildx build \
  --platform linux/amd64 \
  -f Dockerfile \
  --build-arg name=devbox \
  --build-arg path=providers/devbox \
  --push \
  -t crpi-7jr40k6elhldekqp.cn-hangzhou.personal.cr.aliyuncs.com/mlhiter/sealos-devbox-frontend:<tag> .
```

After swapping an image, verify both init and main images:

```bash
kubectl -n devbox-frontend rollout status deployment/devbox-frontend --timeout=10m
kubectl -n devbox-frontend get deploy devbox-frontend \
  -o jsonpath='{.spec.template.spec.initContainers[*].image}{"\n"}{.spec.template.spec.containers[*].image}{"\n"}'
curl -k -I https://devbox.192.168.10.70.nip.io
```

The init container may intentionally stay on a different image than the main
container, especially when only a frontend UI fix is being tested.
