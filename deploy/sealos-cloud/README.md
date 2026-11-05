# Sealos Cloud Component Cluster Image

This directory assembles the component deployments from the existing controller,
frontend, service, and admission webhook deploy directories. The base
`sealos-cloud` image is managed outside `install-v2.sh`.

## Build

Run `init.sh` from any directory to create an isolated build context. The context
contains the shared `charts/` tree, component scripts, and component-scoped
`assets/` and `manifests/` directories. Chart name collisions fail assembly.
The script updates only the staged chart values and manifests to the requested
container image owner and tag; Sealos collects the referenced images into the
cluster image's generated `registry/` directory during `sealos build`.

```sh
IMAGE_OWNER=labring IMAGE_TAG=v5.1.1 bash deploy/sealos-cloud/init.sh /tmp/sealos-cloud
cd /tmp/sealos-cloud
sealos build -t labring/sealos/sealos-cloud:v5.1.1 .
```

The cloud release workflow builds and publishes amd64 and arm64 images after
the controller, frontend, service, and webhook workflows finish.

## Runtime order

The entrypoint waits for the desktop frontend to become ready before continuing,
then deploys components in dependency order and waits for required workloads.
The admission webhook uses its Helm chart. `drop/` and `remove/` files remain
isolated under `assets/<component>/` and are passed to their owning component
scripts.

The installer runs this component image. Database service and launchpad service
deployments are intentionally excluded.

## Wait timeouts

The entrypoint uses these runtime environment variables when waiting for
component workloads:

```sh
SEALOS_CLOUD_DEPLOY_TIMEOUT=30m
SEALOS_CLOUD_JOB_TIMEOUT=15m
```

Override them when running the component image, for example:

```sh
sealos run \
  --env SEALOS_CLOUD_DEPLOY_TIMEOUT=30m \
  --env SEALOS_CLOUD_JOB_TIMEOUT=20m \
  <sealos-cloud-image>
```

`SEALOS_CLOUD_DEPLOY_TIMEOUT` controls Deployment rollout checks. The job
timeout applies to the initialization Job in `account-system`. Deployment
timeout accepts seconds or Kubernetes-style `s`, `m`, or `h` values.
`DEPLOY_TIMEOUT` is also accepted as an alias.

After `license-controller` is deployed, the entrypoint waits for the
`ns-admin` namespace before installing `license-frontend`. It checks every 30
seconds and fails with a diagnostic message if the namespace does not appear
within the Deployment timeout.

The heartbeat component uses `helm upgrade --install` for both first install and
upgrade. The entrypoint therefore waits for the `heartbeat-cronjob` object to
exist instead of waiting for a CronJob condition; it retries for up to 10
minutes and logs progress every 30 seconds.
