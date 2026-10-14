# Standalone validation

## Automated fixtures

Unit tests cover public configuration preservation, route ownership, Node/CSR
identity guards, CRI image aliases and separate image services, quorum checks,
file recovery, inventory transactions, interrupted joins and worker upgrades.
Run affected packages from the lifecycle module with the repository's normal
build tags and Linux dependencies.

The opt-in Linux fixtures mutate their environment. Use disposable clusters.
Build the route/readiness fixture from the lifecycle module:

```sh
mkdir -p /tmp/sealos-mode-tests
GOOS=linux CGO_ENABLED=0 go test -c \
  -o /tmp/sealos-mode-tests/standalone.test ./pkg/runtime/kubernetes/standalone
docker build -f pkg/runtime/kubernetes/standalone/testdata/mode-controller.Dockerfile \
  -t sealos-mode-controller-fixture:test /tmp/sealos-mode-tests
```

Use the cluster architecture for GOARCH, load the image and copy the binary to
the control plane. Run `-test.run '^TestModeRoundTripE2E$' -test.v` with
`SEALOS_MODE_ROUNDTRIP_E2E=1` and
`SEALOS_MODE_CONTROLLER_IMAGE=sealos-mode-controller-fixture:test`.
On Kubernetes v1.30, optionally set `SEALOS_MODE_UPGRADE_BINARIES` to a directory
containing official v1.31.9 kubeadm, kubelet and kubectl binaries.

The round-trip fixture checks repeated conversions, metadata restoration,
route cleanup limited to the owned protocol, optional upgrade before reversal,
and forward conversion while controller readiness fails. A separate disposable
two-host kind fixture covers bootstrap, failed join/resume, learner promotion,
controller updates, reverse conversion, member removal/rejoin and offline reset:

```sh
python3 pkg/runtime/kubernetes/standalone/testdata/membership-e2e.py \
  --kind /path/to/kind --sealctl /path/to/linux/sealctl \
  --controller-image sealos-mode-controller-fixture:test
```

These fixtures test the controller's static Pod and route ownership contract;
they do not test its actual routing algorithm or a particular CNI.

## Prior integration results

The following results were recorded before the simplification refactor. They
describe validation scope, not a claim that a live cluster was retested by it.

| Environment/scenario | Observed result |
| --- | --- |
| Disposable Kubernetes v1.30.13 to v1.31.9 | Upgrade and same-version retry passed local API, new sandbox/image and etcd health/version checks without control-plane Node registration |
| One standalone master and registered worker | Worker reached v1.31.9 Ready; CoreDNS and kube-proxy rollout completed |
| Existing three-master/two-worker Kubernetes v1.28.15 cluster, stacked etcd and separate CRI sockets | Full Sealos same-version rebuilt image upgrade and retry preserved etcd identity and committed the requested rootfs |
| Standalone worker and non-seed master removal/readdition | Original addresses/names/roles retained; etcd learner promotion and worker readiness completed |
| Ordinary worker and restored-master removal/readdition | Native kubeadm removed/recreated etcd membership; unrelated Node identities and storage bindings remained intact |
| Three completed managed mode round trips | Kubelet restart without drain or Node deletion, administrator host reboot, successful reverse conversion and owned-route cleanup |
| Controller protocol update | Previous owned routes removed; other administrator routes retained |

The final existing-cluster reverse conversion had five Ready Nodes, twelve
control-plane mirror Pods, healthy etcd endpoints and no controller manifests or
owned routes. Comparisons preserved five Node UIDs across that round trip,
39 PV/PVC identities and bindings, and ten worker local-volume device/inode pairs.
Explicit deletion/readdition creates a new Node UID as expected.

Network checks from each standalone master covered controller/API readiness,
Kubernetes Service ClusterIP, worker PodIPs, CoreDNS queries, logs, exec,
port-forward and an admission webhook dry-run. CNI exclusions, temporary test
routes, workload cleanup and host reboot were administrator actions. Initial
script conversion was reversed before managed adoption; manual legacy-plan
repair does not establish automatic recovery for older binaries.

## Converted-master removal regression

The review fix was validated on the existing three-master/two-worker v1.28.15
cluster. A master converted from registered mode still had its original Node.
`sealos delete --masters` removed that Node after host cleanup, then
`sealos add --masters` successfully rejoined the same address and hostname without
registering a Node. Etcd returned to three healthy voting members. All three
masters passed static-container, API, PodIP and Service connectivity checks;
their Clusterfiles matched. The other four Node UIDs and all 39 PV/PVC identities
and bindings were preserved, and both workers remained Ready.

Unit tests additionally cover UID deletion preconditions, an absent-Node retry,
and preserving the Node on host identity mismatch or reset failure. Mode
switching still leaves Node cleanup to the administrator.

## Sequential upgrade validation

The standalone lifecycle completed this sequence on an existing cluster:

`v1.28.15 → v1.29.15 → v1.30.14 → v1.31.14 → v1.32.10 → v1.33.6`.

Every stage used `sealos run` with target Kubernetes images containing the
updated sealctl. Checks covered running component and kubelet versions,
standalone arguments, etcd health and member identity, registered-worker
readiness, CoreDNS and Cilium agent readiness, Service and Pod DNS connectivity,
logs, exec and port-forward. Node and storage identities were preserved.
Final checks confirmed matching inventories, cleared maintenance records and
recovery of workloads that were ready before the upgrade.

The v1.30 target recommended an older etcd patch release. The compatibility fix
preserved the existing etcd manifest; a later target upgraded etcd normally.
A controller listener collided with an outgoing connection because the host's
ephemeral range included that port. Administrator port reservations resolved
the collision. This validation does not certify every CNI/version combination.

## Worker configuration publication regression

A disposable Kubernetes v1.33.1 API reproduced the native
`init phase upload-config kubelet` failure with NodeLocalCRISocket disabled:
the ConfigMap was created, then the phase failed because the control-plane Node
did not exist. The replacement publisher succeeded on first execution and
retry with no Nodes present. SubjectAccessReviews verified that the kubeadm
bootstrap group and registered-node group could read `kubelet-config` but not
an unrelated ConfigMap.

A worker consumed that configuration through native kubeadm join, completed TLS
bootstrap and became Ready. A subsequent native kubelet-config upgrade and
kubelet restart also succeeded. Custom `maxPods`, webhook authentication and
certificate rotation were preserved; kubeadm supplied the cluster DNS defaults.
The API contained only the worker Node. This is a targeted phase integration
test, not a full fresh-cluster Sealos SSH installation test.

The opt-in test is `TestStandaloneKubeletPublicationE2E` in the Kubernetes runtime
package. Set `SEALOS_STANDALONE_INIT_CONFIG_E2E_KUBECONFIG` only to a disposable
API's admin kubeconfig; the test refuses to publish if any Node exists.

## Coverage limits

External etcd, etcd 3.5-to-3.6 migration, rootless control planes, non-default
patch layouts, fresh-cluster SSH installation and larger failure scenarios still
need dedicated integration validation. Whole-cluster destruction was exercised
only in disposable fixtures.
Application availability depends on replication and storage placement.
Host mount timeouts encountered during reboot were resolved administratively;
Sealos does not change storage or CNI configuration.
