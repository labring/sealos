# Selective stargz runtime for internal registry images

This deployment package implements the selective rollout:

- Ordinary Pods and public/common registry images keep using the node default
  snapshotter, `overlayfs` by default.
- Images from configured internal registries are mutated to
  `runtimeClassName: stargz`.
- `RuntimeClass/stargz` maps to a containerd CRI runtime handler named
  `stargz`.
- Only that handler uses the `stargz` snapshotter.
- The procedure does not cordon or drain nodes.

This replaces the earlier default-snapshotter experiment. The new steady state
is intentionally safer for production: the default CRI snapshotter remains
normal, and stargz is opt-in through RuntimeClass injection.

## Files

- `deploy-stargz-runtime.sh`
  - Run directly on every node that should support `RuntimeClass/stargz`.
  - Installs `containerd-stargz-grpc`.
  - Adds containerd proxy snapshotter `stargz`.
  - Adds containerd runtime handler `stargz` with `snapshotter = "stargz"`.
  - Keeps the default CRI snapshotter as `DEFAULT_SNAPSHOTTER`, `overlayfs` by
    default.

- `../PROJECT`
  - Kubebuilder project metadata.

- `../cmd/main.go`
  - Kubebuilder/controller-runtime manager entrypoint.
  - Starts the webhook server and health probes.

- `../internal/webhook/`
  - Pod mutating admission webhook implementation and tests.
  - On Pod create, checks all init containers, containers, and ephemeral
    containers.
  - If any image registry matches `INTERNAL_REGISTRIES` and the Pod does not
    already set `spec.runtimeClassName`, injects:

    ```yaml
    spec:
      runtimeClassName: stargz
    ```

- `../Dockerfile`
  - Builds the webhook image.
  - Uses the Kubebuilder-style `cmd/main.go` entrypoint and produces a static
    binary.

- `apply-cluster-stargz-webhook.sh`
  - Run on a node with `kubectl`.
  - Creates `RuntimeClass/stargz`.
  - Deploys the webhook.
  - Uses cert-manager resources in the Kubebuilder style: an `Issuer` and
    `Certificate` create the webhook TLS Secret, and cainjector writes the CA
    bundle into `MutatingWebhookConfiguration`.

## Node Rollout

Run this script directly on each target worker node. It does not use SSH.

```bash
chmod +x webhooks/stargz/deploy/deploy-stargz-runtime.sh
./webhooks/stargz/deploy/deploy-stargz-runtime.sh status
./webhooks/stargz/deploy/deploy-stargz-runtime.sh deploy
./webhooks/stargz/deploy/deploy-stargz-runtime.sh status
```

Important defaults:

```bash
DEFAULT_SNAPSHOTTER=overlayfs
STARGZ_RUNTIME_HANDLER=stargz
```

If your current default snapshotter is not `overlayfs`, set it explicitly:

```bash
DEFAULT_SNAPSHOTTER=<your-default-snapshotter> \
./webhooks/stargz/deploy/deploy-stargz-runtime.sh deploy
```

If a registry is plain HTTP, either make sure it appears under
`/etc/containerd/certs.d/*/hosts.toml` as `http://...`, or pass it explicitly:

```bash
STARGZ_INSECURE_REGISTRIES=registry.internal:5000,sealos.hub:5000 \
./webhooks/stargz/deploy/deploy-stargz-runtime.sh deploy
```

Expected node status after deployment:

```text
containerd service: active
stargz-snapshotter service: active
default CRI snapshotter: overlayfs
runtime handler stargz: snapshotter = "stargz"
containerd stargz snapshotter plugin: ok
```

## Webhook Image

Build and push the webhook image to a registry your cluster can pull:

```bash
docker build -t hub.staging-usw-1.sealos.io/ns-admin/stargz-runtime-injector:v1 \
  webhooks/stargz

docker push hub.staging-usw-1.sealos.io/ns-admin/stargz-runtime-injector:v1
```

Use your real internal registry/repository/tag for production.

Run webhook unit tests locally:

```bash
cd webhooks/stargz
go test ./...
```

## Cluster Rollout

Run from a control-plane node or any machine with working `kubectl`:

cert-manager must already be installed in the cluster. The apply script checks
for the `cert-manager.io/v1` `Certificate` resource before creating the webhook.

```bash
chmod +x webhooks/stargz/deploy/apply-cluster-stargz-webhook.sh

WEBHOOK_IMAGE=hub.staging-usw-1.sealos.io/ns-admin/stargz-runtime-injector:v1 \
INTERNAL_REGISTRIES=hub.staging-usw-1.sealos.io \
./webhooks/stargz/deploy/apply-cluster-stargz-webhook.sh apply
```

Multiple internal registries are comma-separated:

```bash
WEBHOOK_IMAGE=hub.staging-usw-1.sealos.io/ns-admin/stargz-runtime-injector:v1 \
INTERNAL_REGISTRIES=hub.staging-usw-1.sealos.io,registry.internal:5000,sealos.hub:5000 \
./webhooks/stargz/deploy/apply-cluster-stargz-webhook.sh apply
```

Default cluster objects:

```text
Namespace: sealos-system
RuntimeClass: stargz
Runtime handler: stargz
Webhook: pod-stargz-runtime-injector
Certificate: stargz-runtime-injector-serving-cert
TLS Secret: stargz-runtime-injector-tls
Failure policy: Ignore
Skip annotation: stargz.sealos.io/skip=true
```

`failurePolicy` defaults to `Ignore` so a webhook outage does not block Pod
creation. The tradeoff is that internal-registry Pods may temporarily start
without stargz if the webhook is unavailable. Set `WEBHOOK_FAILURE_POLICY=Fail`
only after the webhook has proven stable.

## Verification

Verify RuntimeClass exists:

```bash
kubectl get runtimeclass stargz -o yaml
```

Verify ordinary/public images are not mutated:

```bash
kubectl run stargz-public-check \
  --image=busybox:1.36 \
  --restart=Never \
  --command -- sh -c 'sleep 60'

kubectl get pod stargz-public-check -o jsonpath='{.spec.runtimeClassName}{"\n"}'
kubectl delete pod stargz-public-check --wait=false
```

Expected output is blank.

Verify an internal registry image is mutated:

```bash
kubectl run stargz-internal-check \
  --image=hub.staging-usw-1.sealos.io/ns-admin/devbox-yy-merge:v12 \
  --restart=Never \
  --command -- sh -c 'sleep 60'

kubectl get pod stargz-internal-check -o jsonpath='{.spec.runtimeClassName}{"\n"}'
kubectl delete pod stargz-internal-check --wait=false
```

Expected output:

```text
stargz
```

On the target node, confirm stargz snapshots/logs:

```bash
ctr -n k8s.io snapshots --snapshotter stargz ls
journalctl -u stargz-snapshotter --since "10 minutes ago" --no-pager | tail -120
```

You can also create a direct RuntimeClass verification Pod on a specific node:

```bash
NODE_NAME=$(hostnamectl --static) \
./webhooks/stargz/deploy/deploy-stargz-runtime.sh verify
```

That command creates a Pod with `runtimeClassName: stargz`; it is for node
handler verification, not webhook selection logic.

## Opt Out

To prevent mutation for a specific Pod:

```yaml
metadata:
  annotations:
    stargz.sealos.io/skip: "true"
```

Pods that already set `spec.runtimeClassName` are never overwritten.

Devbox Pods are skipped automatically when they are owned by a
`devbox.sealos.io/v1alpha2` `Devbox` controller reference.

## Rollback

Cluster-side rollback:

```bash
./webhooks/stargz/deploy/apply-cluster-stargz-webhook.sh delete
```

Node-side rollback:

```bash
./webhooks/stargz/deploy/deploy-stargz-runtime.sh rollback
```

Rollback also avoids drain. Node rollback restores the first captured
`/etc/containerd/config.toml`, stops stargz-snapshotter when no stargz config is
left, and restarts containerd.

## Troubleshooting

`http: server gave HTTP response to HTTPS client`

Stargz performs its own remote layer resolution. Plain HTTP registries must be
present in stargz resolver config:

```toml
[[resolver.host."registry.internal:5000".mirrors]]
host = "registry.internal:5000"
insecure = true
```

The node script auto-discovers HTTP registries from
`/etc/containerd/certs.d/*/hosts.toml`. Use `STARGZ_INSECURE_REGISTRIES` for
extra hosts.

`401 Unauthorized`

A first `401 Unauthorized. Refreshing creds...` line can be part of the normal
registry challenge flow. If the Pod fails, confirm the Pod has valid
`imagePullSecrets`, node-level registry credentials, or a kubelet credential
provider that can access the internal registry. This script does not modify
kubelet configuration.

Webhook does not mutate

Check:

```bash
kubectl -n sealos-system get deploy,svc,pod
kubectl get mutatingwebhookconfiguration pod-stargz-runtime-injector -o yaml
kubectl -n sealos-system logs deploy/pod-stargz-runtime-injector-controller-manager
```

The webhook matches by registry host only. For example,
`hub.staging-usw-1.sealos.io/ns/image:tag` matches
`hub.staging-usw-1.sealos.io`; `docker.io/library/busybox:1.36` does not.
