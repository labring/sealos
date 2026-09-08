# Standalone control-plane maintenance

This package implements standalone bootstrap, membership maintenance, upgrades,
and bidirectional control-plane mode conversion. See [lifecycle operations](LIFECYCLE.md)
for init/add/delete/reset, and [mode conversion](MODE_CONVERSION.md) for registered to
standalone conversion, route-controller deployment, and switching back after
an upgrade. The upgrade path operates on kubelets without API credentials.

## Integration boundary

The node-local engine uses the target Kubernetes release's public kubeadm CLI:

- `kubeadm config migrate` converts the public configuration schema.
- `kubeadm config validate` validates the local kubelet configuration using the
  target release's schema, separately from the worker configuration.
- `kubeadm init phase control-plane all` and `etcd local` generate manifests.
- `kubeadm certs renew all --config ...` renews locally managed certificates.
- After all masters succeed, `kubeadm init phase upload-config kubeadm` publishes
  the new cluster configuration.
- Registered workers use `kubeadm upgrade node phase kubelet-config`.
- Existing CoreDNS and kube-proxy installations use their public addon phases.

Manifest generation runs inside a private mount namespace with a staging
directory mounted over `/etc/kubernetes/manifests`. This uses normal phase
execution, including kubeadm patch support, without exposing incomplete manifests
to kubelet. Preflight can pull images and perform kubeadm's host preparation;
`--check-only` does not mean a read-only command.

The engine uses the published CRI v1 gRPC API to pull images and inspect/stop
local sandboxes, the etcd v3 client and snapshot API for health and backups,
and client-go for authenticated API requests. It does not import kubeadm's
internal Go packages. Kubernetes explicitly does not support
`k8s.io/kubernetes` as an application library.

These are public component interfaces. The composed standalone upgrade workflow
is maintained by Sealos and is not an upstream kubeadm standalone support claim.

## Preconditions

- Linux, systemd, a local Unix CRI endpoint, and permission to create mount
  namespaces using `unshare` and `mount`.
- Stable Kubernetes 1.28 or later; no downgrade or skipped Kubernetes minor.
- Target `kubeadm`, `kubelet`, and `kubectl` binaries in one directory, all
  reporting the requested version. Managed installed binaries are regular files
  under `/usr/bin`.
- Existing kubeadm component manifests under `/etc/kubernetes/manifests`,
  PKI under `/etc/kubernetes/pki`, and a working `admin.conf`.
- Kubelet has no `--kubeconfig` or `--bootstrap-kubeconfig`, uses an absolute
  `--config` path, and has no additional static manifest source. Its local
  configuration disables certificate bootstrap/rotation and API webhook
  authentication/authorization.
- The existing component configuration and optional patch directory describe
  the desired manifests. Manual manifest edits must be represented there.
- The administrator has already configured control-plane networking and any
  route-controller deployment. Sealos does not detect or reconfigure a CNI.

The local standalone kubelet configuration is preserved. The cluster's worker
KubeletConfiguration remains separate; this path never uploads the standalone
configuration into the worker ConfigMap. Kubelet starts with explicit empty
API kubeconfig arguments and `--register-node=false`.

Local etcd upgrades preserve member identity and the data directory, reject
downgrades and skipped minor versions, and check every member's health/version.
The local etcd image must have a version tag. Data and WAL hostPath mappings
must be preserved; subPath mappings are rejected.
The implemented etcd minor transition is 3.5 to 3.6. It requires all 3.5 members
to be at least 3.5.32, removal of `--enable-v2` and `ETCD_ENABLE_V2`, and an
`etcdutl` binary from the 3.5 series at version 3.5.32 or later in the target
binary directory. Before replacing manifests, the old etcd sandbox is stopped
and that utility checks the offline data directory and WAL for custom v2 data.
External etcd is checked for health but is not upgraded.

## Invocation

Use `sealos switch standalone` to convert a registered
cluster and commit `spec.controlPlaneMode: standalone`. An image upgrade through `sealos run` then
dispatches to this engine. Both the Sealos and sealctl binaries must contain
this implementation; the target image must contain the target Kubernetes
binaries. Direct mode changes through `sealos apply` are rejected.

The host-level command can also be invoked directly:

```sh
sealctl standalone-upgrade \
  --config /etc/kubernetes/standalone-upgrade.yaml \
  --version v1.31.9 \
  --binary-dir /opt/kubernetes-target \
  --check-only
```

Run the same command without `--check-only` to apply. Use `--patches` for a
host-local kubeadm patch directory. Sealos passes the configured
`InitConfiguration.patches.directory` to each master.

## Ordering and failure behavior

Sealos checks every master before upgrading the first, then upgrades masters
sequentially. A failure stops subsequent masters and prevents publication of the
new cluster configuration. Each local upgrade restarts the local control-plane
components together. A single-master cluster has an API outage during restart.

Before replacement, the engine backs up `/etc/kubernetes`, all managed files,
the kubelet arguments, and a local-etcd snapshot. Backups are private to root
under `/var/lib/sealos/standalone-upgrades/upgrade-*`; `files.json` describes the
individual file backups. Backups are retained after success as well as failure.

If file replacement fails before activation, the engine restores the original
files and starts kubelet. If file recovery fails, kubelet stays stopped and the
error identifies the affected file. Certificate renewal remains in place;
the original certificates are in the configuration backup.

Once new components may have started, the engine keeps the complete new file
set and reports readiness failures. It never automatically restores an etcd
snapshot or downgrades an etcd member. Host failure or forced process termination
requires inspection and manual recovery using the retained backups. A healthy
host supports same-version retries; an unhealthy host must be repaired before
preflight succeeds.

Workers are cordoned and upgraded sequentially. An originally cordoned worker
stays cordoned; a worker cordoned by this workflow is uncordoned only after it
reports the target kubelet version and a Ready heartbeat newer than the restart,
using the worker's clock. This implementation does not
evict workloads; administrators must arrange workload draining where required.
Existing addons must complete their rollout before the upgrade reports success.

Rootfs and patch image guest commands are skipped on standalone masters because
they can replace kubelet services. Worker and application guest execution keeps
its existing behavior. Administrator-supplied application commands still execute
with their normal privileges.

## Validation and remaining work

Validated in a disposable Linux control plane:

- Activation of a standalone test fixture, followed by Kubernetes
  v1.30.13 to v1.31.9 preflight and actual upgrade.
- Same-version v1.31.9 retry, local API version, new CRI sandboxes, component
  health, image identity, and etcd health/version.
- No observed Node registration events during the upgrade; no Node or control
  plane mirror Pod after the upgrade and retry.
- In a separate fixture with one standalone master and one registered worker,
  the public worker configuration phase and kubelet replacement reached
  v1.31.9 Ready. CoreDNS and kube-proxy completed rollout using the public addon
  phases with the original component configuration preserved.

Unit tests cover configuration preservation, standalone arguments, ambiguous CRI
identity, image aliases, health probe failures, partial file recovery, and
stopping the Sealos pipeline at a failed host. The affected Linux packages build
and pass tests.

The [existing-cluster integration report](INTEGRATION.md) also covers the full
`sealos run` pipeline on three masters with stacked etcd, same-version image
replacement, bidirectional conversion, and real network checks.

Still requires integration validation: etcd 3.5 to 3.6, external
etcd, rootless control planes, and non-default patch configurations.

Standalone init, reset, and add/delete master use the dedicated lifecycle
described in [LIFECYCLE.md](LIFECYCLE.md). A disposable two-host cluster validates
learner promotion, failed bootstrap resume, reverse conversion of a newly
bootstrapped host, member removal/rejoin, controller updates, offline destruction,
and fresh standalone initialization. The integration report distinguishes
existing-cluster tests from these disposable fixture tests.

## Upstream references

- [Kubernetes library support policy](https://github.com/kubernetes/kubernetes/blob/v1.30.3/README.md)
- [kubeadm control-plane phase](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init-phase/#cmd-phase-control-plane)
- [kubeadm upgrade node phases](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade-phase/)
- [CRI v1 API](https://github.com/kubernetes/cri-api/blob/master/pkg/apis/runtime/v1/api.proto)
- [etcd 3.5 to 3.6 upgrade requirements](https://etcd.io/docs/v3.6/upgrades/upgrade_3_6/)
- [etcdutl offline v2store check](https://github.com/etcd-io/etcd/blob/v3.5.32/etcdutl/etcdutl/check_command.go)
