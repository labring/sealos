# Standalone control-plane lifecycle

Standalone control planes run kubelet without API credentials or Node
registration. Sealos manages their static components and route-controller;
workers retain the registered kubelet lifecycle. Both Sealos and the rootfs
sealctl executable must include this implementation.

## Commands

| Operation | Implementation |
| --- | --- |
| New cluster with `spec.controlPlaneMode: standalone` | Public kubeadm certificate, kubeconfig and manifest phases; start standalone kubelet; publish normal worker configuration |
| `sealos add --masters ADDRESS` | Copy shared PKI, add a stacked-etcd learner, start static components, promote and verify |
| `sealos delete --masters ADDRESS` | Check surviving quorum, remove the identified etcd member, stop local workloads and clean managed files/routes |
| `sealos add/delete --nodes ADDRESS` | Common registered-worker path, including completed-join detection on retry and UID-checked deletion after kubelet cleanup |
| `sealos run KUBERNETES_IMAGE` | Sequential standalone master upgrades, then registered workers and existing addons |
| `sealos reset` | Clean workers and managed masters, allowing the authorized reset to resume after the API stops |
| `sealos switch standalone/registered` | Convert all existing masters and commit the mode after every host succeeds |

Master0 deletion retains the existing Sealos restriction; registry migration is
not implemented. Removing every master requires reset. Submit additions and
removals separately. Existing delete/reset confirmations remain unchanged.

```sh
sealos switch standalone --cluster default --check-only
sealos switch standalone --cluster default
sealos switch registered --cluster default -y
```

Switching asks for the same hostname confirmation as delete/reset. `--yes`/`-y`
skips confirmation; `--check-only` does not prompt. Both modes accept `--timeout`
(ten minutes per host). Registered mode rejects controller flags. Directly
changing an existing Clusterfile's mode with `apply` is rejected.

### Controller configuration

Sealos generates the static Pod manifest. Standalone mode accepts:

| Flag | Default |
| --- | --- |
| `--route-controller-image` | `ghcr.io/zijiren233/route-controller:main` |
| `--route-controller-kubeconfig` | `/etc/kubernetes/route-controller/kubeconfig` |
| `--route-controller-config` | Unset |
| `--route-table` | `254` |
| `--route-protocol` | `99` |
| `--update-controller` | `false` |

Pin the image for reproducibility. Administrators provision the kubeconfig and
optional config on every master. They must be regular files at absolute paths;
credentials must be embedded or reference paths available inside the container.
Only these two selected files are mounted. The generated host-network Pod uses
the public controller `run` command, `NET_ADMIN`, and health port `127.0.0.1:9919`.
Explicit ownership, kubeconfig and health flags take precedence over config.

Update an active deployment using only the settings to change:

```sh
sealos switch standalone --update-controller --route-controller-image example/controller:v2 -y
sealos switch standalone --update-controller --route-table 200 --route-protocol 111 -y
```

Unspecified values retain the saved settings. An empty `--route-controller-config ''`
removes that mount. An update without changed flags restarts the controller to
pick up replaced hostPath files. Changed settings require `--update-controller`.
The new table/protocol pair must be empty before changing ownership. Sealos stops
kubelet and controller, removes old owned routes, installs the new manifest and
waits for controller readiness. The journal retains both ownership pairs until
completion, including for reverse conversion after an interrupted update.

For a new cluster, these optional fields belong to the normal Cluster spec:

```yaml
spec:
  controlPlaneMode: standalone
  routeController:
    image: ghcr.io/zijiren233/route-controller:main
    kubeconfig: /etc/kubernetes/route-controller/kubeconfig
    table: 254
    protocol: 99
```

Omitted fields use the same defaults as switching. Fresh-cluster controller
credentials must match the cluster CA and have suitable RBAC; provision them
before bootstrap. Sealos does not create a controller identity or copy
administrator-owned controller credentials during master addition.

## Administrator boundary

- Stable Kubernetes 1.28 or later, Linux/systemd, local CRI v1 Unix endpoints,
  `/usr/bin/kubelet`, `/etc/kubernetes/manifests`, `/etc/kubernetes/pki`, and a
  working `admin.conf` are required. A separate kubelet image-service endpoint
  is supported. Kubelet must use an absolute config path with no config-dir
  override or additional manifest source.
- Administrators configure CNI exclusions, forwarding, API endpoint availability,
  API-to-Pod/Service connectivity, stale kernel state and any egress selector.
  Sealos does not identify or reconfigure CNI components.
- The table/protocol pair is exclusively reserved for route-controller.
  Reverse conversion removes its IPv4/IPv6 routes through netlink after stopping
  the controller. Other route protocols and administrator policy rules remain.
- Switching restarts kubelet immediately. Administrators arrange workload
  migration, stale Node/mirror Pod cleanup and subsequent host reboots. Sealos
  does not cordon, drain, delete Nodes or explicitly stop ordinary CRI sandboxes
  during forward conversion. Kubelet may itself terminate orphaned API workloads.
- Reverse conversion needs the `kubernetes.io/kube-apiserver-client-kubelet`
  signer and CSR create/approve/read/watch/delete permissions, plus Node,
  ConfigMap and Lease permissions. External PKI must provide a compatible signer.

Bootstrap requires shared CA/SA keys over SSH. External-CA-only and rootless
bootstrap are unsupported. For external etcd, provision its credentials at the
public configuration's paths. Stacked-etcd bootstrap uses the kubeadm layout and
`etcd.local.dataDir`; membership and filesystem overrides in extraArgs are rejected.
Supported kubelet flags, labels, provider identity, taints and patches are retained.

## Mode conversion

Sealos preflights every master, then converts them sequentially. Each host saves
registered kubelet arguments, changed configuration fields, kubeconfig and Node
metadata. Forward conversion disables API credentials, registration, rotation,
webhooks and serving, writes the controller manifest, and restarts kubelet.
It checks standalone arguments and local control-plane health. Controller
reconciliation continues asynchronously so administrator CNI cleanup and reboot
can follow; existing Node/mirror Pod objects do not block completion. A failed
conversion never automatically reconnects kubelet.

Reverse conversion obtains fresh credentials through the CSR API and installs
them using client-go's certificate store. It stops kubelet/controller, removes
managed routes and restores only the fields changed during conversion, preserving
subsequent upgrades. Native kubelet registration starts with a temporary
NoSchedule taint. Sealos restores saved metadata and schedulability, publishes
kubeadm's effective CRI socket annotation, restores the service configuration,
and waits for Node Ready and control-plane mirror Pods.

An existing Node retains its UID and PodCIDRs. If an administrator deleted it,
kubelet creates a new Node and CIDRs are allocated afresh. Administrators must
review restored annotations describing allocated network state. Health checks
do not certify arbitrary Pod/Service networking, logs, exec or port-forward.

## Upgrade interfaces and ordering

The node-local engine uses the target release's public kubeadm CLI:

- `config migrate` and `config validate` preserve the public schema and validate
  local standalone configuration separately from worker configuration.
- `init phase control-plane all` and `etcd local` generate manifests, including
  public patch support, in a private mount namespace over the manifest directory.
  This requires `unshare` and `mount`; incomplete output stays hidden from kubelet.
- `certs renew all` renews local certificates. After every master succeeds,
  `init phase upload-config kubeadm` publishes the new cluster configuration.
- Workers use `upgrade node phase kubelet-config`. Existing CoreDNS and kube-proxy
  use their public addon phases and must finish rollout.

CRI v1 supplies image and sandbox operations; etcd v3 supplies membership, health
and snapshots; client-go supplies API access. This package does not import
kubeadm internals. The composed workflow is maintained by Sealos; it does not
claim upstream kubeadm standalone lifecycle support.

All masters pass preflight before the first upgrade. Masters then upgrade
sequentially; failure stops later hosts and configuration publication. Local
components restart together, causing an API outage on a single-master cluster.
Target kubeadm/kubelet/kubectl binaries must report the requested version.
Downgrades and skipped Kubernetes minors are rejected. Desired manifest edits
must be represented in public configuration or the optional patch directory.

Stacked etcd keeps member identity and data/WAL hostPath mappings. Downgrades,
skipped minors, subPath mappings and digest-only etcd images are rejected.
The supported etcd minor transition is 3.5 to 3.6: every 3.5 member must be at
least 3.5.32, with `--enable-v2`/`ETCD_ENABLE_V2` removed. Supply etcdutl 3.5.32
or later from the 3.5 series in the target binary directory for the offline
v2store check before replacement. External etcd is checked but not upgraded.

Workers are cordoned sequentially without eviction. The Node annotation
`sealos.io/standalone-upgrade-cordon` records ownership atomically with cordon.
Failure keeps the cordon; successful retry clears it only after target version
and a Ready heartbeat newer than restart, measured with the worker's clock.
Administrator cordons, including unowned cordons from older binaries, remain.
Rootfs/patch guest commands skip standalone masters because they can replace
kubelet services. Worker and application guest commands retain normal behavior.

The internal host command supports direct diagnostics:

```sh
sealctl standalone-upgrade --config /etc/kubernetes/standalone-upgrade.yaml \
  --version v1.31.9 --binary-dir /opt/kubernetes-target --check-only
```

Omit `--check-only` to apply; `--patches` selects a host-local patch directory.
Preflight can pull images and perform kubeadm host preparation, so it is not
strictly read-only. Prefer Sealos commands for managed clusters.

## Recovery

Host operations share one file lock. Bootstrap records its immutable plan and
etcd identity before mutation; a retry recovers lost add responses by cluster ID
and peer URL without duplicating voters. A partial learner can be reset.
Pending bootstrap/reset blocks incompatible host maintenance.

The private `/var/lib/sealos/control-plane-mode/state.json` baseline survives
upgrades and is refreshed after a completed round trip. New standalone masters
receive a local baseline for later registration without creating a Node.
Pre-existing script installations without a baseline are not adopted automatically.

At cluster level, a file lock and API Lease serialize maintenance. The persistent
`kube-system/sealos-control-plane-mode` journal records conversion target and
master inventory; hosts retain their own progress. Every retry rechecks hosts.
The `control-plane-transition.json` marker is copied before conversion and
Clusterfile mode is committed only after every master succeeds. Unknown YAML
fields and all documents are preserved. Resume the command or explicitly switch
to the opposite mode after failure; never clear journals to bypass recovery.

The separate `kube-system/sealos-standalone-lifecycle` journal stores a request
digest and involved hosts without SSH credentials. Private local inventory
records keep the committed view and recovery host union until remote inventory
synchronization succeeds. Repeat the original request to resume; SSH credentials
can be repaired without changing request identity. Successful CLI and image
containerd preflight checks are reused only within that interrupted addition.

Explicit reset can supersede a failed apply when all involved hosts are present
in its recovery inventory. Authorization persists before API destruction, so
reset can finish offline. Successful stages are checkpointed; failed cleanup
retains recovery information. Success archives `Clusterfile.reset` and removes
the active inventory. Legacy unmanaged inventories retain ordinary offline reset.

Upgrade backups under `/var/lib/sealos/standalone-upgrades/upgrade-*` retain
configuration, files, kubelet arguments and local-etcd snapshots. Replacement
failure before activation restores old files; failed restoration leaves kubelet
stopped. Renewed certificates remain, with originals in the backup. After new
components may have started, keep the new files and repair readiness; no automatic
etcd restore or downgrade occurs. Forced termination needs manual inspection.
Healthy hosts support same-version retry. Backups remain after success.

## References and validation

See [testing and validation scope](TESTING.md) for fixtures and observed results.

- [Kubernetes library support policy](https://github.com/kubernetes/kubernetes/blob/v1.30.3/README.md)
- [Public kubeadm phases](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init-phase/)
- [Upgrade node phases](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade-phase/)
- [CRI v1 API](https://github.com/kubernetes/cri-api/blob/master/pkg/apis/runtime/v1/api.proto)
- [etcd 3.5 to 3.6 requirements](https://etcd.io/docs/v3.6/upgrades/upgrade_3_6/)
