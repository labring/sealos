
#  OpenEBS LocalPV Provisioner

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![Chart Lint and Test](https://github.com/openebs/zfs-localpv/workflows/Chart%20Lint%20and%20Test/badge.svg)
![Release Charts](https://github.com/openebs/zfs-localpv/workflows/Release%20Charts/badge.svg?branch=develop)

A Helm chart for openebs zfs localpv provisioner. This chart bootstraps OpenEBS ZFS LocalPV provisioner deployment on a [Kubernetes](http://kubernetes.io) cluster using the  [Helm](https://helm.sh) package manager.


**Homepage:** <http://www.openebs.io/>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| pawanpraka1 | pawan@mayadata.io |  |
| xUnholy | michaelfornaro@gmail.com |  |
| prateekpandey14 | prateek.pandey@mayadata.io |  |


## Get Repo Info

```console
helm repo add openebs-zfslocalpv https://openebs.github.io/zfs-localpv
helm repo update
```

_See [helm repo](https://helm.sh/docs/helm/helm_repo/) for command documentation._

## Install Chart

Please visit the [link](https://openebs.github.io/zfs-localpv/) for install instructions via helm3.

```console
# Helm
$ helm install [RELEASE_NAME] openebs-zfslocalpv/zfs-localpv
```

**Note:** If moving from the operator to helm
- Make sure the namespace provided in the helm install command is same as `OPENEBS_NAMESPACE` (by default it is `openebs`) env in the controller statefulset.
- Before installing, clean up the stale statefulset and daemonset from `kube-system` namespace using the below commands
```sh
kubectl delete sts openebs-zfs-controller -n kube-system
kubectl delete ds openebs-zfs-node -n kube-system
```


_See [configuration](#configuration) below._

_See [helm install](https://helm.sh/docs/helm/helm_install/) for command documentation._

## Uninstall Chart

```console
# Helm
$ helm uninstall [RELEASE_NAME]
```

This removes all the Kubernetes components associated with the chart and deletes the release.

_See [helm uninstall](https://helm.sh/docs/helm/helm_uninstall/) for command documentation._

## Upgrading Chart

```console
# Helm
$ helm upgrade [RELEASE_NAME] [CHART] --install
```

## Configuration

The following table lists the configurable parameters of the OpenEBS ZFS Localpv chart and their default values.

| Parameter| Description| Default|
| -| -| -|
| `imagePullSecrets`| Provides image pull secrect| `""`|
| `zfsPlugin.image.registry`| Registry for openebs-zfs-plugin image| `""`|
| `zfsPlugin.image.repository`| Image repository for openebs-zfs-plugin| `openebs/zfs-driver`|
| `zfsPlugin.image.pullPolicy`| Image pull policy for openebs-zfs-plugin| `IfNotPresent`|
| `zfsPlugin.image.tag`| Image tag for openebs-zfs-plugin| `2.3.0`|
| `zfsNode.allowedTopologyKeys`| Custom topology keys required for provisioning| `"kubernetes.io/hostname,"`|
| `zfsNode.driverRegistrar.image.registry`| Registry for csi-node-driver-registrar image| `registry.k8s.io/`|
| `zfsNode.driverRegistrar.image.repository`| Image repository for csi-node-driver-registrar| `sig-storage/csi-node-driver-registrar`|
| `zfsNode.driverRegistrar.image.pullPolicy`| Image pull policy for csi-node-driver-registrar| `IfNotPresent`|
| `zfsNode.driverRegistrar.image.tag`| Image tag for csi-node-driver-registrar| `v2.8.0`|
| `zfsNode.updateStrategy.type`| Update strategy for zfsnode daemonset | `RollingUpdate` |
| `zfsNode.kubeletDir`| Kubelet mount point for zfsnode daemonset| `"/var/lib/kubelet/"` |
| `zfsNode.encrKeysDir` | Zfs encryption key directory| `"/home/keys"` |
| `zfsNode.annotations` | Annotations for zfsnode daemonset metadata| `""`|
| `zfsNode.podAnnotations`| Annotations for zfsnode daemonset's pods metadata | `""`|
| `zfsNode.resources`| Resource and request and limit for zfsnode daemonset containers | `""`|
| `zfsNode.labels`| Labels for zfsnode daemonset metadata | `""`|
| `zfsNode.podLabels`| Appends labels to the zfsnode daemonset pods| `""`|
| `zfsNode.nodeSelector`| Nodeselector for zfsnode daemonset pods| `""`|
| `zfsNode.tolerations` | zfsnode daemonset's pod toleration values | `""`|
| `zfsNode.securityContext` | Seurity context for zfsnode daemonset container | `""`|
| `zfsController.resizer.image.registry`| Registry for csi-resizer image| `registry.k8s.io/`|
| `zfsController.resizer.image.repository`| Image repository for csi-resizer| `sig-storage/csi-resizer`|
| `zfsController.resizer.image.pullPolicy`| Image pull policy for csi-resizer| `IfNotPresent`|
| `zfsController.resizer.image.tag`| Image tag for csi-resizer| `v1.8.0`|
| `zfsController.snapshotter.image.registry`| Registry for csi-snapshotter image| `registry.k8s.io/`|
| `zfsController.snapshotter.image.repository`| Image repository for csi-snapshotter| `sig-storage/csi-snapshotter`|
| `zfsController.snapshotter.image.pullPolicy`| Image pull policy for csi-snapshotter| `IfNotPresent`|
| `zfsController.snapshotter.image.tag`| Image tag for csi-snapshotter| `v6.2.2`|
| `zfsController.snapshotController.image.registry`| Registry for snapshot-controller image| `registry.k8s.io/`|
| `zfsController.snapshotController.image.repository`| Image repository for snapshot-controller| `sig-storage/snapshot-controller`|
| `zfsController.snapshotController.image.pullPolicy`| Image pull policy for snapshot-controller| `IfNotPresent`|
| `zfsController.snapshotController.image.tag`| Image tag for snapshot-controller| `v6.2.2`|
| `zfsController.provisioner.image.registry`| Registry for csi-provisioner image| `registry.k8s.io/`|
| `zfsController.provisioner.image.repository`| Image repository for csi-provisioner| `sig-storage/csi-provisioner`|
| `zfsController.provisioner.image.pullPolicy`| Image pull policy for csi-provisioner| `IfNotPresent`|
| `zfsController.provisioner.image.tag`| Image tag for csi-provisioner| `v3.5.0`|
| `zfsController.updateStrategy.type`| Update strategy for zfs localpv controller statefulset | `RollingUpdate` |
| `zfsController.annotations` | Annotations for zfs localpv controller statefulset metadata| `""`|
| `zfsController.podAnnotations`| Annotations for zfs localpv controller statefulset's pods metadata | `""`|
| `zfsController.resources`| Resource and request and limit for zfs localpv controller statefulset containers | `""`|
| `zfsController.labels`| Labels for zfs localpv controller statefulset metadata | `""`|
| `zfsController.podLabels`| Appends labels to the zfs localpv controller statefulset pods| `""`|
| `zfsController.nodeSelector`| Nodeselector for zfs localpv controller statefulset pods| `""`|
| `zfsController.tolerations` | zfs localpv controller statefulset's pod toleration values | `""`|
| `zfsController.securityContext` | Seurity context for zfs localpv controller statefulset container | `""`|
| `rbac.pspEnabled` | Enable PodSecurityPolicy | `false` |
| `serviceAccount.zfsNode.create` | Create a service account for zfsnode or not| `true`|
| `serviceAccount.zfsNode.name` | Name for the zfsnode service account| `openebs-zfs-node-sa`|
| `serviceAccount.zfsController.create` | Create a service account for zfs localpv controller or not| `true`|
| `serviceAccount.zfsController.name` | Name for the zfs localpv controller service account| `openebs-zfs-controller-sa`|
| `analytics.enabled` | Enable or Disable google analytics for the controller| `true`|

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`.

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```bash
helm install <release-name> -f values.yaml openebs/zfs-localpv
```

> **Tip**: You can use the default [values.yaml](values.yaml)
