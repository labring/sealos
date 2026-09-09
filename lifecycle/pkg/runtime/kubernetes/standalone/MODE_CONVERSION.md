# Control-plane mode conversion

`sealos switch standalone` and `sealos switch registered` convert the existing master inventory in either
direction. It preserves etcd membership and control-plane manifests and does
not change worker kubelet configuration. Both Sealos and the sealctl executable
in the cluster rootfs must include this implementation.

## Usage

Sealos generates the route-controller static Pod manifest automatically.
Provision the controller kubeconfig at
`/etc/kubernetes/route-controller/kubeconfig` on every master, with its RBAC
and networking configured beforehand. No manifest argument is needed.

```sh
sealos switch standalone --cluster default --check-only

sealos switch standalone --cluster default

sealos switch registered --cluster default
```

Sealos asks for confirmation before switching, using the same hostname input
as its delete/reset commands. The prompt identifies the inventory and target
mode. Cancellation or an input error stops execution before maintenance locks,
cluster loading, or host changes. Use `--yes` (`-y`) to skip this prompt:

```sh
sealos switch standalone --cluster default --yes
sealos switch registered --cluster default -y
```

`--check-only` does not ask for confirmation. `--yes` only bypasses the prompt;
it does not bypass preflight checks, readiness requirements or recovery guards.
Confirmation happens once in Sealos; the internal sealctl commands remain
non-interactive.

The equivalent `sealctl switch standalone` and `sealctl switch registered`
commands operate on one local host.
Use the Sealos command for a managed cluster so that the cluster mode, inventory
copies, recovery journal, and other lifecycle commands stay coordinated.

Standalone accepts these optional parameters:

| Flag | Default | Purpose |
| --- | --- | --- |
| `--route-controller-image` | `ghcr.io/zijiren233/route-controller:main` | Controller image; pin a version or digest for reproducible deployments |
| `--route-controller-kubeconfig` | `/etc/kubernetes/route-controller/kubeconfig` | Dedicated kubeconfig on each master |
| `--route-controller-config` | Unset | Optional controller YAML file on each master |
| `--route-table` | `254` | Exclusively reserved route table/protocol pair |
| `--route-protocol` | `99` | Exclusively reserved route table/protocol pair |
| `--update-controller` | `false` | Restart the controller and update only explicitly selected settings while remaining standalone |

Registered accepts none of the controller parameters. Both subcommands accept
`--check-only` and `--timeout`; Sealos also accepts `--cluster` (`-c`). The old
`--mode` and `--route-controller-manifest` flags are not supported.

Update an existing deployment with a pinned image or a different ownership pair:

```sh
sealos switch standalone --update-controller --route-controller-image example/controller:v2 -y
sealos switch standalone --update-controller --route-table 200 --route-protocol 111 -y
```

Unspecified settings retain their saved values. Passing an empty
`--route-controller-config ''` explicitly removes the optional configuration
mount. An update without changed flags restarts the controller to pick up
replaced hostPath files. An active deployment rejects changed settings unless
`--update-controller` is used. The command uses the same confirmation and
recovery guards as conversion.

Before an ownership change, the new table/protocol pair must be empty. With
kubelet and controller stopped, Sealos removes the old owned routes and installs
the new manifest. The journal retains both ownership pairs until readiness
succeeds, so interruption and reverse conversion can clean either pair.

The generated Pod uses the controller's public CLI. Explicit route ownership,
kubeconfig, and health-address flags override the optional configuration file.
No CNI-specific flags or RBAC templates are built into Sealos. Kubeconfig and
optional configuration files must be regular files at absolute paths on each
master. The kubeconfig must contain embedded credentials or references usable
inside the container; only the selected kubeconfig and configuration are mounted.

`--check-only` checks each host and may pull the controller image. It does not
sign kubelet certificates or change kubelet configuration. A real conversion
also checks running components and, for registered mode, CSR signing.
The default timeout is ten minutes per host.

## Administrator contract

- Stable Kubernetes 1.28 or later, Linux with systemd, the standard `/usr/bin/kubelet` installation, a local
  CRI v1 endpoint, `/etc/kubernetes/manifests`, and a working host admin.conf.
  Kubelet must have an absolute config path, with no config-dir override or
  additional static manifest source.
- The generated Pod is named `route-controller` in `kube-system`, uses host
  networking, and mounts the pre-provisioned files read-only. Its container
  requires the controller's public `run` command and health endpoints on
  `127.0.0.1:9919`, and receives only the `NET_ADMIN` capability.
- The specified route table and protocol are passed explicitly to the controller.
  This pair must initially contain no routes and remains exclusively reserved
  for this controller. Reverse conversion removes its IPv4 and IPv6 routes
  through netlink after the controller stops. It does not flush other routes.
  The controller does not create policy routing `ip rule` entries; Sealos does
  not remove administrator-owned policy rules.
- Administrators configure CNI exclusion rules, forwarding, stale CNI kernel
  state, API-to-Pod/Service reachability, and any Konnectivity or egress selector.
  Sealos neither identifies a CNI nor changes its resources or host settings.
- The cluster signer for `kubernetes.io/kube-apiserver-client-kubelet` must be
  available. The admin identity needs CSR create, approve, read/watch, and
  delete permissions, plus Node read/update, ConfigMap, and Lease permissions
  required by the workflow. External PKI must provide a compatible signer.
- Administrators arrange workload migration, draining, and cleanup of stale
  Nodes and mirror Pods as appropriate. Switching does not cordon, evict,
  delete Nodes, or explicitly stop API-managed sandboxes through CRI.
- The command restarts kubelet immediately and then prompts the administrator
  to reboot each control-plane host. A kubelet restart is not a substitute for
  host reboot and CNI kernel-state cleanup.

The controller's application readiness contract remains administrator-owned.
HTTP readiness and local component probes do not prove arbitrary Pod/Service
networking, logs, exec, port-forward, or CNI recovery after switching back.

## Forward conversion

Sealos preflights every master, then converts and verifies them one at a time.
On each host it records the registered kubelet arguments, fields it will change,
original kubeconfig, and Node metadata. It disables kubelet API credentials,
registration, certificate rotation, webhooks, and serving; writes the generated
controller manifest; reloads systemd; and restarts kubelet.

The controller manifest is immediately visible to kubelet. Ordinary workload
cleanup remains the administrator's responsibility; Sealos does not drain or
issue CRI stop requests for those workloads. Kubelet itself can terminate
orphaned runtime Pods after the API configuration source is removed, so this
operation does not promise to preserve running ordinary containers. Kubernetes may retain the old Node
and mirror Pods after kubelet disconnects.

Success requires standalone kubelet arguments and healthy local control-plane
containers after kubelet restart. Route-controller reconciliation continues
asynchronously because CNI cleanup is administrator-owned. It does not require
deleting old API objects. The command reminds the administrator to clean up and
reboot the hosts. A failed conversion never automatically reconnects kubelet to
the API. Successful conversion does not certify Pod/Service connectivity.
The controller keeps its conflict checks and retries after administrator cleanup;
it never takes over another route owner's entries to make conversion succeed.

## Reverse conversion

The engine first obtains fresh kubelet credentials through the Kubernetes CSR
API. It does not require the original client certificate to remain valid or
access the cluster CA private key. Client-go's certificate file store installs
the certificate and maintains the kubelet rotation symlink.

It stops kubelet and route-controller, removes the managed manifest and reserved
routes, and restores only the kubelet fields changed by conversion. It keeps
the currently installed binaries, certificates, component manifests, and etcd
data, including changes made by a standalone upgrade.

Kubelet then registers itself using its native registration path with a
temporary NoSchedule taint. Sealos restores saved labels, annotations, custom
taints and provider identity, preserving administrator-selected schedulability.
It also publishes the saved effective CRI endpoint in kubeadm's Node annotation
so kubeadm versions that discover the runtime through Node metadata can reset
or upgrade the restored control plane, including hosts initialized standalone.
The original systemd configuration is reactivated, and Node Ready and
control-plane mirror Pods are checked.

An existing Node retains its UID and PodCIDRs. If the administrator deleted it,
kubelet creates a new Node and PodCIDRs are allocated afresh. Saved annotations are restored
without CNI interpretation; administrators must review any annotation that
describes allocated network state. Node-owned resources may be garbage-collected
and are the responsibility of their normal controllers to recreate.

## Recovery and persistence

The host baseline is stored privately under
`/var/lib/sealos/control-plane-mode/state.json`. It survives standalone upgrades
and is refreshed when a completed round trip enters standalone again. Preserve
this file: adopting a pre-existing standalone installation without a registered
baseline is not implemented.

A shared host lock excludes conversion, bootstrap, reset, controller updates,
and standalone upgrades. Pending bootstrap/reset journals block incompatible
maintenance until they are resumed or explicitly reset. Sealos also
uses a Kubernetes Lease to serialize conversion commands and a persistent
`kube-system/sealos-control-plane-mode` ConfigMap to record the master inventory,
target mode, and verified hosts. Local inventory operations use a file lock.
The local `control-plane-transition.json` recovery marker is copied to masters
before conversion starts. Clusterfile mode changes only after every master
has succeeded; all YAML documents and unknown fields are preserved.

The generated manifest and its route table/protocol are saved in the host
baseline. Retries use those saved values; a pending controller update rejects a
different update request. Reverse conversion always uses the saved ownership
pairs, including after a process restart. Re-entering standalone after a round
trip retains the last controller settings unless explicitly changed.

On failure, repeat the original command to resume, or explicitly request the
opposite mode to reverse the partial conversion. Hosts are checked again on
retry. Do not manually clear the journals or edit the mode field to bypass a
failed transition. Lifecycle commands check the pending transition before
mutating the cluster. Use one inventory and an exclusive maintenance window;
commands already running elsewhere must finish before conversion starts.
Inventories with an explicit `controlPlaneMode` require a working admin
kubeconfig and API to authorize maintenance. Once a standalone reset has
persisted its authorization, the same reset can resume offline after it stops
the API. See [lifecycle recovery](LIFECYCLE.md) for inventory transactions.
Legacy inventories without mode management retain their previous offline reset
behavior.

An interrupted process releases its host/file locks automatically. Its cluster
lease expires after sixty seconds; the persistent transition journal continues
to block unrelated lifecycle commands. No automatic etcd rollback or Kubernetes
downgrade is performed.

## Validation scope

The opt-in `TestModeRoundTripE2E` runs the production host engine in a disposable
one-master, one-worker kubeadm cluster. Its controller fixture exercises the
static Pod, HTTP readiness, and route ownership contracts; it does not test a
particular CNI or the real route-controller routing algorithm. It covers repeated
round trips with the generated manifest, standalone upgrade before returning,
metadata preservation, removal of owned routes while preserving another protocol
in the same table, and completed conversion while controller readiness is failing.

To build the fixture from the lifecycle module directory:

```sh
mkdir -p /tmp/sealos-mode-tests
GOOS=linux CGO_ENABLED=0 go test -c \
  -o /tmp/sealos-mode-tests/standalone.test ./pkg/runtime/kubernetes/standalone
docker build -f pkg/runtime/kubernetes/standalone/testdata/mode-controller.Dockerfile \
  -t sealos-mode-controller-fixture:test /tmp/sealos-mode-tests
```

Use the cluster's architecture for `GOARCH` when cross-compiling. Load the image
into an explicitly disposable cluster and copy the test binary to its control
plane. Run the binary there with `-test.run '^TestModeRoundTripE2E$' -test.v`,
`SEALOS_MODE_ROUNDTRIP_E2E=1`, and
`SEALOS_MODE_CONTROLLER_IMAGE=sealos-mode-controller-fixture:test`.
Optionally set `SEALOS_MODE_UPGRADE_BINARIES` to a directory containing the
official v1.31.9 kubeadm, kubelet, and kubectl binaries when starting on v1.30.
The test mutates the cluster and is unsuitable for a shared environment.

Unit tests cover configuration restoration after upgrades, temporary registration
taints, Node identity collisions, Clusterfile document preservation, lease and
journal guards, and stopping/reversing the orchestration after a failed master.
The membership fixture also exercises a newly added control plane's reverse
conversion and controller ownership update in a two-control-plane cluster.
The [integration report](INTEGRATION.md) records actual CNI networking and full
SSH-driven Sealos conversion on an existing three-master cluster.
Standalone init/add/delete/reset are described
in [LIFECYCLE.md](LIFECYCLE.md).
