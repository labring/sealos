# Standalone control planes

Standalone control planes run static Pods without registering a Node. Sealos
manages kubelet and route-controller; workers use the normal registered lifecycle.
Requires Linux/systemd, Kubernetes 1.28+, CRI v1, standard kubeadm paths and matching
Sealos and rootfs sealctl binaries with standalone support.

## Switch modes

```sh
sealos switch control-plane standalone -c default --check-only
sealos switch control-plane standalone -c default
sealos switch control-plane registered -c default -y
```

The command switches all masters. `-c` selects the cluster; `-y` skips confirmation.
`--timeout` defaults to ten minutes per host. Use `switch` to change an existing
cluster's mode; editing `spec.controlPlaneMode` through `apply` is rejected.

- **Standalone:** restarts kubelet immediately, without draining or deleting
  Nodes. Administrators must handle workload migration, stale Node cleanup and
  host reboots. Verify controller readiness and Pod/Service connectivity afterwards;
  switching does not wait for controller reconciliation.
- **Registered:** obtains fresh kubelet credentials through the CSR API, removes
  controller-owned routes, restores registered settings and waits for Node Ready
  and mirror Pods. Existing Nodes retain their identity; deleted Nodes receive
  new UIDs and PodCIDRs. A working kubelet client certificate signer is required.

Sealos does not configure CNI. Administrators must provide CNI exclusions,
forwarding and API-to-Pod/Service connectivity.

## Route-controller

Sealos generates the static Pod manifest. Provision the controller kubeconfig
and optional config file on **every master**, including newly added masters.
Use absolute paths to regular files; only the selected files are mounted, so
kubeconfig credentials should be embedded. Fresh-cluster credentials must match
the cluster CA and have suitable RBAC.

Standalone mode accepts these flags; registered mode does not:

| Flag | Default |
| --- | --- |
| `--route-controller-image` | `ghcr.io/labring-sigs/route-controller:0.1.0` |
| `--route-controller-kubeconfig` | `/etc/kubernetes/route-controller/kubeconfig` |
| `--route-controller-config` | Unset |
| `--route-table` | `254` |
| `--route-protocol` | `99` |

Reserve the table/protocol pair exclusively for the controller. If its listener
ports overlap the host's ephemeral port range, add health port `9919` and default
metrics port `9918` to `net.ipv4.ip_local_reserved_ports`, retaining existing
reservations and accounting for custom metrics settings.

For a new cluster, configure the Clusterfile:

```yaml
spec:
  controlPlaneMode: standalone
  routeController:
    image: ghcr.io/labring-sigs/route-controller:0.1.0
    kubeconfig: /etc/kubernetes/route-controller/kubeconfig
    table: 254
    protocol: 99
```

Update an existing controller:

```sh
sealos switch control-plane standalone --update-controller \
  --route-controller-image example/controller:v2 -y
```

The image flag overrides `spec.routeController.image` and is saved after success.
Other unspecified settings retain their saved values. `--route-controller-config ''`
removes the optional config mount; an update without changed flags restarts the
controller to pick up replaced files. Updates wait for readiness. Changing route
ownership requires an empty target table/protocol pair and removes the old owned
routes. Added masters inherit the active controller settings.

## Lifecycle and recovery

Use the usual `sealos add`, `delete`, `run` and `reset` commands. Master addition
and removal manage etcd membership without Node registration. Master0 removal
retains the existing Sealos restriction; submit additions and removals separately.

`sealos run KUBERNETES_IMAGE` upgrades masters sequentially, then workers and
existing addons. Kubernetes downgrades and skipped minor versions are rejected.
Workers are cordoned without eviction; administrator cordons are preserved.
Single-master upgrades interrupt the API. Represent custom manifests in kubeadm
configuration or patches so upgrades preserve them.

If kubeadm recommends an older etcd version, the existing etcd manifest is kept.
External etcd is not upgraded. The supported etcd 3.5-to-3.6 transition requires
all 3.5 members at 3.5.32+, v2 disabled and an etcdutl binary from the 3.5 series
at 3.5.32+; see the [etcd upgrade requirements](https://etcd.io/docs/v3.6/upgrades/upgrade_3_6/).
Bootstrap requires shared CA/SA keys; external-CA-only and rootless bootstrap are
unsupported. Provision external-etcd credentials separately.

After a failure, repair the reported issue and repeat the original command.
Keep recovery records intact. Mode conversion also permits an explicit switch
back. Existing script-based standalone installations need a managed baseline
before using this lifecycle; they are not adopted automatically.

Upgrade backups, including local-etcd snapshots, remain under
`/var/lib/sealos/standalone-upgrades/upgrade-*`. Once new components may have
started, recovery does not automatically restore etcd or downgrade binaries.

See [TESTING.md](TESTING.md) for test commands and coverage.
