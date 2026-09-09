# Sealos standalone integration validation

This report records validation on an existing three-control-plane, two-worker
cluster on 2026-09-08 and 2026-09-09. The cluster was not reset. Host addresses, hostnames,
and roles were preserved. Original inventories, host configuration, and an etcd
snapshot were saved privately before maintenance.

## Environment and administrator preparation

- Kubernetes v1.28.15, stacked etcd 3.5.15, containerd 1.7.27.
- Separate CRI runtime and image-service Unix sockets.
- Cilium 1.16.9 using VXLAN, with existing application and local-PV workloads.
- A pinned route-controller image, main routing table, protocol 99.
- Development Sealos CLI and sealctl supplied through a rebuilt Kubernetes image.

The starting cluster had been converted by a script, so its Clusterfile did not
describe the running kubelets. Host identity, the cluster CA, live processes,
and the script's saved baseline were checked first. The script's reverse path
restored registered mode before Sealos performed a managed conversion.

The administrator excluded the three control-plane hostnames from the Cilium
DaemonSet. Temporary independent routes maintained API-to-Service connectivity
while testing registered mode, and were removed after returning to standalone.
These changes were test-environment administration; Sealos contains no CNI
detection or configuration logic.

## Completed checks

| Scenario | Observed result |
| --- | --- |
| Unmanaged script conversion | Rejected until the original registered baseline was restored |
| CLI confirmation and flag isolation | Cancellation prevented conversion; registered mode rejected controller flags |
| Registered to standalone | All three control planes converted and the committed inventory matched the hosts |
| Interrupted conversion | Retained the journal and successfully resumed the original request |
| Controller ownership update, protocol 99 to 100 | Removed previous owned routes on all three hosts |
| Controller change without explicit update | Rejected |
| Standalone to registered | Restored original control-plane names, labels, taints, and schedulability; removed protocol 100 routes and retained independent administrator routes |
| Registered back to standalone | All three converted, protocol 99 restored, temporary routes removed |
| Deleting master0 with force | Rejected before removal |
| Full same-version Kubernetes image upgrade | Rootfs distribution, registry mirroring, three sequential control-plane upgrades, worker kubelet phases, CoreDNS rollout, and inventory synchronization succeeded |
| Repeat full image upgrade | All three etcd member IDs retained; both workers Ready at completion; exactly one new rootfs record committed; network matrix passed again |

Network checks passed from each standalone control plane: controller readiness,
local API readiness, Kubernetes Service ClusterIP, both worker health PodIPs,
CoreDNS PodIP queries, API logs, exec, port-forward, and an admission webhook
request using server-side dry-run. Only the two workers appeared as Nodes.
A continuous Node watch observed no control-plane registration during upgrade.

## Bugs found by integration testing

- Mode conversion's SSH timeout could end before the requested operation timeout.
  Commands now inherit the maintenance context and the requested deadline.
- Image verification incorrectly assumed CRI ImageService shared the runtime
  socket. The engine now honors the kubelet image-service endpoint, including
  command-line precedence over configuration.
- Same-version rebuilt rootfs images could retain the old image in inventory.
  Equal versions now select the later requested image.
- A worker's pre-restart Ready condition could end a same-version upgrade early.
  Completion now requires a Ready heartbeat newer than the restart, using the
  worker's clock.
- The containerd preflight blocked interrupted additions after Sealos had
  installed containerd. Both CLI and image preflight results are now recorded
  separately in the active operation journal and reused only by that retry.
- Image bootstrap cleanup still used the generic five-minute SSH timeout.
  Bootstrap commands now use the lifecycle context, including cancellation.
- Worker discovery used the current CLI's default VIP, which differed from this
  old cluster's certificate SANs. Worker joins now use the published kubeadm
  control-plane endpoint, preserving TLS verification.

The original Kubernetes image contained registry authentication templates that
differed from the running cluster. The private test image was reconciled with
the existing worker's effective authentication; the registry password was not
changed. The first worker-add attempt also predated image-preflight journaling.
Its confirmed successful image preflight was migrated from the saved execution
log before retry. This administrative migration is not an automatic recovery
claim for operations started by older binaries.

Worker add/delete uses the common registered-worker runtime path. Shared fixes
verify host/Node identity, stop kubelet before deleting a Node by UID, retain
cleanup failures, and recognize an already completed worker join.

## Scope limits

The existing-cluster upgrade used the same Kubernetes version with rebuilt
tooling. Cross-minor upgrade is covered by the separate disposable fixture,
not by this cluster. External etcd, etcd 3.5-to-3.6 migration, new-cluster SSH
installation, and whole-cluster reset are not validated by this report.
Application availability during individual worker maintenance depends on its
replicas, disruption budgets, and local storage placement.

## Follow-up recovery and control-plane rejoin

The existing script-converted cluster was exercised without a cluster reset. One
worker was deleted and re-added with the same IP, hostname, and role; its eight
local-volume directory inode/device pairs and 39 PV/PVC identities and bindings
were preserved. Both workers returned Ready and the route-controller restored
both PodCIDR routes and the Service CIDR ECMP route.

A non-seed standalone control plane was then deleted and re-added with the same
identity. Deletion removed its etcd member; no control-plane Node existed. The remaining two
members stayed healthy. Rejoin completed after explicitly repairing an immutable
legacy bootstrap plan with a missing `kubernetesVersion`. New plans use the
kubeadm version or the committed rootfs version label, and fail if neither is
available; application image tags and worker versions are not version sources. The rejoined host has etcd,
API server, scheduler, controller-manager, and route-controller static Pods, and
it remains absent from the Kubernetes Node list. All three etcd endpoints
reported healthy, all three route-controller readiness checks passed, and the
network/logs/exec/port-forward/admission matrix passed from each control plane.

The first rejoin attempt exposed the missing version in the saved input. Manual
repair of that already-saved plan is not an automatic retry-recovery guarantee.

## Current regression boundary

The preceding results predate the revised mode-switch contract. The current
command writes configuration and restarts kubelet without draining, deleting
Nodes, or explicitly stopping ordinary sandboxes. It asks the administrator to
clean up and reboot the hosts. Results for that revised contract must be recorded
separately; earlier automatic Node deletion is not evidence for this behavior.

Registered-mode regression found an administrator-applied Cilium hostname
exclusion outside Helm values. The test administrator removed that exclusion
before testing CNI on the control planes. Product code remains CNI-agnostic.
CSR approval now rereads resource versions on conflict and accepts an existing
approval without duplicating it. The conversion API timeout also accommodates
admission webhook timeouts before a fail-open decision.

Ordinary worker deletion and addition completed with the same hostname and IP.
The first cleanup attempt exceeded the default SSH timeout; the existing
behavior of removing the host from inventory on deletion failure was retained.
After administrator inventory reconciliation, cleanup completed with an extended
execution timeout. The rejoined worker became Ready. Twenty PVs and nineteen
PVCs retained their identities and bindings, and all ten checked local-volume
directory device/inode pairs were unchanged.

Ordinary control-plane deletion exposed a missing CRI socket annotation on a
Node restored from the legacy standalone setup. Kubernetes 1.28 kubeadm could
not discover the runtime and skipped etcd membership cleanup. The test
administrator removed that specific stale member after verifying the surviving
quorum, then re-added the host successfully. Reverse conversion now restores
the effective CRI endpoint annotation. A unit test checks the restored metadata
and verifies that the saved baseline remains unchanged.

With the corrected binaries, one complete registered/standalone round trip
preserved all five Node UIDs and schedulability and all 39 storage objects.
Reverse conversion returned all five Nodes to Ready, removed the controller
manifests and owned routes from every control plane, and restored the CRI socket
annotations. A second forward conversion also preserved those identities while
returning successfully despite controller route conflicts left by the CNI.

Administrator host reboots were then performed sequentially. The first rebooted
control plane recovered with only its five static containers, a ready API and
controller, and three managed routes; all three etcd endpoints were healthy.
The next host did not recover SSH or its API within the ten-minute observation
window. The remaining two etcd endpoints and cluster API stayed healthy. After
the host recovered, both rebooted control planes passed the network matrix.
The seed control plane still had CNI route conflicts and required its own reboot.

The second reverse conversion completed after resuming a Node update conflict.
All five Nodes returned Ready with their UIDs, addresses, and schedulability
unchanged. All controller manifests and owned routes were removed, and all
three etcd endpoints were healthy. Node restoration now retries update conflicts
within the conversion deadline after client-go's short retry budget is exhausted.

Ordinary deletion of the restored non-seed control plane then completed with
exit status zero. Native kubeadm automatically removed its etcd member; the
remaining two endpoints were healthy, and the Node and inventory entry were
removed. No manual etcd member removal was needed. Runtime sandbox cleanup
reported warnings, which the existing kubeadm and image cleanup flow tolerated.
All PV/PVC identities and bindings remained unchanged.

Local tests passed for the standalone engine, Kubernetes runtime, apply drivers,
processor, CLI packages, bootstrap, types, and new lifecycle journal cases.
The three legacy Clusterfile rendering tests also fail on the unchanged upstream
baseline. Incremental lint reported no issues, and the coverage packages passed
with the race detector. Final publication and CI verification remain pending
completion of the live regression.
