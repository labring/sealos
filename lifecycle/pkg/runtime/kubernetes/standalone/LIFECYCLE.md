# Standalone lifecycle operations

The lifecycle dispatches on `spec.controlPlaneMode: standalone`. Both Sealos
and the sealctl executable in the rootfs must contain this implementation.
Controller hosts never register Kubernetes Nodes during bootstrap, membership
maintenance, or upgrade. Explicit `sealos switch registered` reconnects kubelet.

| Operation | Standalone behavior |
| --- | --- |
| `sealos apply -f Clusterfile` for a new cluster | Generate credentials/manifests with public kubeadm phases; start standalone kubelet before publishing normal worker configuration |
| `sealos add --masters ADDRESS` | Copy shared PKI privately, add a stacked-etcd learner, start static components, then promote the member and verify readiness |
| `sealos delete --masters ADDRESS` | Check surviving quorum, remove the etcd member by peer URL and member ID, stop local workloads, clean owned routes and kubeadm files |
| `sealos add/delete --nodes ADDRESS` | Keep registered worker behavior; recognize successful joins on retry and stop kubelet before deleting a worker Node by UID |
| `sealos reset` | Stop workers and all managed masters, clean hosts without requiring a surviving etcd quorum, and archive the inventory |
| `sealos run KUBERNETES_IMAGE` | Use the dedicated [standalone upgrade](README.md) and preserve the worker configuration separately |
| `sealos switch standalone --update-controller` | Update selected controller settings and clean previous route ownership without registering Nodes |

Existing Sealos CLI confirmation rules remain in force. The switch subcommands
use `--yes`/`-y`; delete/reset keep their existing confirmation/force interface.
Internal sealctl operations are non-interactive.

Sealos' existing master0 deletion restriction also applies to standalone
inventories, including changes submitted through `apply`. This change does not
migrate registry data. Removing every master requires `reset`. Submit additions
and removals as separate operations. Etcd changes execute sequentially, and a
normal removal requires a healthy voting quorum among surviving members.

## Initial configuration

For a new cluster, select the mode in its Clusterfile. Controller settings are
optional; omitted fields use the same defaults as mode conversion:

```yaml
spec:
  controlPlaneMode: standalone
  routeController:
    image: ghcr.io/zijiren233/route-controller:main
    kubeconfig: /etc/kubernetes/route-controller/kubeconfig
    config: /etc/kubernetes/route-controller/config.yaml
    table: 254
    protocol: 99
```

This fragment belongs to a normal Sealos Cluster document with its image and
host inventory. Pin the controller image for reproducible deployment. Omit
`config` when no optional controller configuration is needed.

Administrators provision the controller kubeconfig and optional configuration
on every new control plane before initialization or `add`. For a fresh cluster,
these credentials must match the cluster CA; provision the CA and credentials
before bootstrap, and arrange their RBAC. Sealos does not invent a controller
identity, embed CNI-specific RBAC, or distribute administrator-owned controller
credentials from an existing master. Initial bootstrap checks API/component
health without requiring controller readiness, since workers and their network
may be installed subsequently. Adding to an existing cluster requires controller
readiness as well.

The supported bootstrap layout uses Linux/systemd, `/usr/bin/kubelet`, a CRI v1
Unix endpoint, `/etc/kubernetes/manifests`, and `/etc/kubernetes/pki`, with stable
Kubernetes 1.28 or later. Shared CA/SA keys must be available to the administrator
over SSH. External-CA-only and rootless bootstrap are not supported. External
etcd credentials must already be provisioned on the new host at the paths in
the public cluster configuration. Etcd membership and filesystem identity
overrides in `etcd.local.extraArgs` are rejected; use kubeadm's normal layout
and `etcd.local.dataDir`. User kubelet flags, Node labels, provider identity,
`nodeRegistration.taints`, and public patches are retained where supported.

Sealos does not detect a CNI or alter its resources. Administrators are
responsible for controller credential validity, network exclusion rules,
forwarding, API endpoint availability, and API-to-Pod/Service reachability.

## Recovery

Each host saves its immutable bootstrap plan, etcd identity, and registered
baseline in `/var/lib/sealos/control-plane-mode`. A new master's baseline is
synthesized locally; it is not created as a Node in the API. It supports later
native kubelet registration through the same CSR workflow as mode conversion.

Bootstrap writes the standalone systemd override before generating kubelet
credentials. A lost etcd add response is recovered by the recorded cluster ID
and peer URL. Retries reuse the original plan and baseline, recreate the
controller sandbox to pick up replaced hostPath files, and verify readiness.
They do not add duplicate voters. Reset can remove a partially joined learner.

At cluster level, an API Lease serializes maintenance. A persistent
`kube-system/sealos-standalone-lifecycle` ConfigMap records a request digest and
the involved hosts; it contains no SSH credentials. The private local
`standalone-lifecycle.json` retains the committed inventory and the union of
current and requested hosts. Inventory readers continue to use the committed
view until the operation and remote synchronization succeed.

An error stops later steps and retains the journal. Repeat the original request
to resume; a different mutation is blocked. Transport credentials can be fixed
without changing the operation identity. Explicit `sealos reset` may supersede
a failed apply/add/delete operation only when its recovery inventory includes
all involved hosts. This also covers interrupted initial installation.

An addition records successful containerd preflight checks before installing
the runtime. Retries of that operation reuse those checks, allowing a partially
installed host to continue. A new operation must check again; failed checks and
hosts outside the recorded inventory never receive this exemption. Host and
Kubernetes identity checks still run during the resumed operation.

Reset persists authorization before destroying the API and keeps a remote API
tombstone until the API disappears. A subsequent reset from the same inventory
can therefore finish offline. Host reset tombstones and local pipeline progress
prevent repeating already completed destruction/unmount stages. Failed cleanup
does not discard the inventory. Successful reset writes `Clusterfile.reset` and
removes the active Clusterfile; it retains the local recovery archive and
previous upgrade backups.

Mode conversion, controller updates, and upgrade are blocked while bootstrap or
reset is incomplete. Do not remove journals to bypass these checks. Manual
standalone installations without a saved registered baseline are not adopted
automatically; their original Node metadata and kubelet settings cannot be
reconstructed reliably.

## Validation

`testdata/membership-e2e.py` runs the actual sealctl executable in an explicitly
disposable two-host kind cluster. It converts the first control plane, resets
the worker and joins that host as a second standalone control plane. It covers
an intentional controller-readiness failure and retry, learner promotion,
controller ownership changes, reverse conversion, member removal/rejoin,
whole-cluster destruction after the API stops, and fresh standalone bootstrap.
The generated controller Pod uses the route/readiness fixture from
`mode_e2e_linux_test.go`; the real CNI routing algorithm is outside this test.

```sh
python3 pkg/runtime/kubernetes/standalone/testdata/membership-e2e.py \
  --kind /path/to/kind \
  --sealctl /path/to/linux/sealctl \
  --controller-image sealos-mode-controller-fixture:test
```

Unit tests cover quorum/identity guards, bootstrap configuration preservation,
ownership option merging, inventory isolation, API journal exclusion and reset
takeover, and failure/resume behavior. The [existing-cluster integration report](INTEGRATION.md)
records full SSH-driven rootfs distribution, registry mirroring, three-master
upgrades, bidirectional conversion, and actual CNI network checks. External
etcd and three-or-more-master failure scenarios still require validation.

The composition uses public kubeadm CLI phases, etcd v3 APIs, CRI v1, client-go,
and netlink. It does not import `k8s.io/kubernetes` as an application library or
claim that upstream kubeadm supports standalone lifecycle directly.
