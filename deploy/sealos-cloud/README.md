# Sealos Cloud Component Cluster Image

This directory assembles the component deployments from the existing controller,
frontend, service, and admission webhook deploy directories. The base
`sealos-cloud` cluster image remains a separate installation step.

## Build

Run `init.sh` from any directory to create an isolated build context. The context
contains the shared `charts/` tree, component scripts, and component-scoped
`assets/` and `manifests/` directories. Chart name collisions fail assembly.
The script updates only the staged chart values and manifests to the requested
container image owner and tag; Sealos collects the referenced images into the
cluster image's generated `registry/` directory during `sealos build`.

```sh
IMAGE_OWNER=labring IMAGE_TAG=v5.1.1 bash deploy/sealos-cloud/init.sh /tmp/sealos-cloud-components
cd /tmp/sealos-cloud-components
sealos build -t labring/sealos-cloud-components:v5.1.1 .
```

The cloud release workflow builds and publishes amd64 and arm64 images after
the controller, frontend, service, and webhook workflows finish.

## Runtime order

The entrypoint applies the app controller manifests, deploys controllers and
services, and waits for their deployments before running the account
initialization Job. It then deploys the heartbeat CronJob, frontend charts, and
admission webhook Helm chart. `drop/` and `remove/` files remain isolated under
`assets/<component>/` and are passed to their owning component scripts.

The installer runs the base `sealos-cloud` image followed by this component
image. Components removed from this repository are intentionally excluded.
