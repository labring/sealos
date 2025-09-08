# OpenEBS CStor

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![Release Charts](https://github.com/openebs/cstor-operators/workflows/Release%20Charts/badge.svg?branch=master)
![Chart Lint and Test](https://github.com/openebs/cstor-operators/workflows/Chart%20Lint%20and%20Test/badge.svg)

OpenEBS CStor helm chart for Kubernetes. This chart bootstraps OpenEBS cstor operators and csi driver deployment on a [Kubernetes](http://kubernetes.io) cluster using the  [Helm](https://helm.sh) package manager

**Homepage:** <http://www.openebs.io/>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| kiranmova | kiran.mova@mayadata.io |  |
| prateekpandey14 | prateek.pandey@mayadata.io |  |
| sonasingh46 | sonasingh46@gmail.com |  |

## Get Repo Info

```console
helm repo add openebs-cstor https://openebs.github.io/cstor-operators
helm repo update
```

_See [helm repo](https://helm.sh/docs/helm/helm_repo/) for command documentation._

## Install Chart

Please visit the [link](https://openebs.github.io/cstor-operators) for install instructions via helm3.

```console
# Helm
$ helm install [RELEASE_NAME] openebs-cstor/cstor --namespace [NAMESPACE]
```
<details>
  <summary>Click here if you're using MicroK8s.</summary>

  ```console
  microk8s helm3 install [RELEASE_NAME] openebs-cstor/cstor --namespace [NAMESPACE] --set-string csiNode.kubeletDir="/var/snap/microk8s/common/var/lib/kubelet/"
  ```
</details>

_See [configuration](#configuration) below._

_See [helm install](https://helm.sh/docs/helm/helm_install/) for command documentation._


## Dependencies

By default this chart installs additional, dependent charts:

| Repository | Name | Version |
|------------|------|---------|
| https://openebs.github.io/node-disk-manager | openebs-ndm | 2.1.0   |

To disable the dependency during installation, set `openebsNDM.enabled` to `false`.

_See [helm dependency](https://helm.sh/docs/helm/helm_dependency/) for command documentation._

## Uninstall Chart

```console
# Helm
$ helm uninstall [RELEASE_NAME] --namespace [NAMESPACE]
```

This removes all the Kubernetes components associated with the chart and deletes the release.

_See [helm uninstall](https://helm.sh/docs/helm/helm_uninstall/) for command documentation._

## Upgrading Chart

```console
# Helm
$ helm upgrade [RELEASE_NAME] [CHART] --install --namespace [NAMESPACE]
```

## Configuration

The following table lists the configurable parameters of the OpenEBS CStor chart and their default values.

You can modify different parameters by specifying the desired value in the `helm install` command by using the `--set` and/or the `--set-string` flag(s). You can modify the parameters of the [Node Disk Manager chart](https://openebs.github.io/node-disk-manager) by adding `openebs-ndm` before the desired parameter in the `helm install` command.

In the following sample command we modify `csiNode.nodeSelector` from the cstor chart and `ndm.nodeSelector` from the openebs-ndm chart to only schedule pods on nodes labelled with `openebs.io/data-plane=true`. We also enable the 'Use OS-disk' feature gate using the `featureGates.UseOSDisk.enabled` parameter from the openebs-ndm chart.


```console
helm install openebs-cstor openebs-cstor/cstor --namespace openebs --create-namespace \
	--set-string csiNode.nodeSelector."openebs\.io/data-plane"=true \
	--set-string openebs-ndm.ndm.nodeSelector."openebs\.io/data-plane"=true \
	--set openebs-ndm.featureGates.UseOSDisk.enabled=true
```
<details>
  <summary>Click here if you're using MicroK8s.</summary>

  If you are using MicroK8s, it is necessary to add the following flag:

  ```console
  --set-string csiNode.kubeletDir="/var/snap/microk8s/common/var/lib/kubelet/"
  ```
</details>

| Key | Type | Default                                                     | Description |
|-----|------|-------------------------------------------------------------|-------------|
| admissionServer.annotations | object | `{}`                                                        | Admission webhook annotations |
| admissionServer.componentName | string | `"cstor-admission-webhook"`                                 | Admission webhook Component Name |
| admissionServer.failurePolicy | string | `"Fail"`                                                    | Admission Webhook failure policy |
| admissionServer.image.pullPolicy | string | `"IfNotPresent"`                                            | Admission webhook image pull policy |
| admissionServer.image.registry | string | `nil`                                                       | Admission webhook image registry |
| admissionServer.image.repository | string | `"openebs/cstor-webhook"`                                   | Admission webhook image repo |
| admissionServer.image.tag | string | `"3.6.0"`                                                   | Admission webhook image tag |
| admissionServer.nodeSelector | object | `{}`                                                        | Admission webhook pod node selector |
| admissionServer.podAnnotations | object | `{}`                                                        |  Admission webhook pod annotations |
| admissionServer.resources | object | `{}`                                                        | Admission webhook pod resources |
| admissionServer.securityContext | object | `{}`                                                        | Admission webhook security context |
| admissionServer.tolerations | list | `[]`                                                        | Admission webhook tolerations |
| cleanup.image.registry | string | `nil`                                                       |  cleanup pre hook image registry |
| cleanup.image.repository | string | `"bitnami/kubectl"`                                         |  cleanup pre hook image repository |
| csiController.annotations | object | `{}`                                                        | CSI controller annotations |
| csiController.attacher.image.pullPolicy | string | `"IfNotPresent"`                                            | CSI attacher image pull policy |
| csiController.attacher.image.registry | string | `"registry.k8s.io/"`                                        |  CSI attacher image registry |
| csiController.attacher.image.repository | string | `"sig-storage/csi-attacher"`                                |  CSI attacher image repo |
| csiController.attacher.image.tag | string | `"v4.3.0"`                                                  | CSI attacher image tag |
| csiController.attacher.logLevel | string | _unspecified_                                               | Override log level for CSI attacher container (1 = least verbose, 5 = most verbose) |
| csiController.attacher.name | string | `"csi-attacher"`                                            |  CSI attacher container name|
| csiController.componentName | string | `"openebs-cstor-csi-controller"`                            | CSI controller component name |
| csiController.logLevel | string | `"5"`                                                       |  Default log level for all CSI controller containers (1 = least verbose, 5 = most verbose) unless overridden for a specific container |
| csiController.nodeSelector | object | `{}`                                                        |  CSI controller pod node selector |
| csiController.podAnnotations | object | `{}`                                                        | CSI controller pod annotations |
| csiController.provisioner.image.pullPolicy | string | `"IfNotPresent"`                                            | CSI provisioner image pull policy |
| csiController.provisioner.image.registry | string | `"registry.k8s.io/"`                                        | CSI provisioner image pull registry |
| csiController.provisioner.image.repository | string | `"sig-storage/csi-provisioner"`                             | CSI provisioner image pull repository |
| csiController.provisioner.image.tag | string | `"v3.5.0"`                                                  | CSI provisioner image tag |
| csiController.provisioner.logLevel | string | _unspecified_                                               | Override log level for CSI provisioner container (1 = least verbose, 5 = most verbose) |
| csiController.provisioner.name | string | `"csi-provisioner"`                                         | CSI provisioner container name |
| csiController.resizer.image.pullPolicy | string | `"IfNotPresent"`                                            | CSI resizer image pull policy  |
| csiController.resizer.image.registry | string | `"registry.k8s.io/"`                                        | CSI resizer image registry |
| csiController.resizer.image.repository | string | `"sig-storage/csi-resizer"`                                 |  CSI resizer image repository|
| csiController.resizer.image.tag | string | `"v1.8.0"`                                                  | CSI resizer image tag |
| csiController.resizer.logLevel | string | _unspecified_                                               | Override log level for CSI resizer container (1 = least verbose, 5 = most verbose) |
| csiController.resizer.name | string | `"csi-resizer"`                                             | CSI resizer container name |
| csiController.resources | object | `{}`                                                        | CSI controller container resources |
| csiController.securityContext | object | `{}`                                                        | CSI controller security context |
| csiController.snapshotController.image.pullPolicy | string | `"IfNotPresent"`                                            | CSI snapshot controller image pull policy |
| csiController.snapshotController.image.registry | string | `"k8s.gcr.io/"`                                             | CSI snapshot controller image registry |
| csiController.snapshotController.image.repository | string | `"sig-storage/snapshot-controller"`                         | CSI snapshot controller image repository |
| csiController.snapshotController.image.tag | string | `"v6.2.2"`                                                  | CSI snapshot controller image tag |
| csiController.snapshotController.logLevel | string | _unspecified_                                               | Override log level for CSI snapshot controller container (1 = least verbose, 5 = most verbose) |
| csiController.snapshotController.name | string | `"snapshot-controller"`                                     | CSI snapshot controller container name |
| csiController.snapshotter.image.pullPolicy | string | `"IfNotPresent"`                                            | CSI snapshotter image pull policy |
| csiController.snapshotter.image.registry | string | `"registry..k8s.io/"`                                       | CSI snapshotter image pull registry |
| csiController.snapshotter.image.repository | string | `"sig-storage/csi-snapshotter"`                             | CSI snapshotter image repository |
| csiController.snapshotter.image.tag | string | `"v6.2.2"`                                                  | CSI snapshotter image tag |
| csiController.snapshotter.name | string | `"csi-snapshotter"`                                         | CSI snapshotter container name |
| csiController.tolerations | list | `[]`                                                        | CSI controller pod tolerations |
| csiNode.annotations | object | `{}`                                                        | CSI Node annotations |
| csiNode.componentName | string | `"openebs-cstor-csi-node"`                                  | CSI Node component name |
| csiNode.driverRegistrar.image.pullPolicy | string | `"IfNotPresent"`                                            | CSI Node driver registrar image pull policy|
| csiNode.driverRegistrar.image.registry | string | `"registry.k8s.io/"`                                        | CSI Node driver registrar image registry |
| csiNode.driverRegistrar.image.repository | string | `"sig-storage/csi-node-driver-registrar"`                   | CSI Node driver registrar image repository |
| csiNode.driverRegistrar.image.tag | string | `"v2.8.0"`                                                  |  CSI Node driver registrar image tag|
| csiNode.driverRegistrar.logLevel | string | _unspecified_                                               | Override log level for CSI node driver registrar container (1 = least verbose, 5 = most verbose) |
| csiNode.driverRegistrar.name | string | `"csi-node-driver-registrar"`                               | CSI Node driver registrar container name |
| csiNode.kubeletDir | string | `"/var/lib/kubelet/"`                                       | Kubelet root dir |
| csiNode.labels | object | `{}`                                                        | CSI Node pod labels |
| csiNode.logLevel | string | `"5"`                                                       | Default log level for CSI node containers (1 = least verbose, 5 = most verbose) unless overriden for a specific container |
| csiNode.nodeSelector | object | `{}`                                                        |   CSI Node pod nodeSelector |
| csiNode.podAnnotations | object | `{}`                                                        | CSI Node pod annotations |
| csiNode.resources | object | `{}`                                                        | CSI Node pod resources |
| csiNode.securityContext | object | `{}`                                                        | CSI Node pod security context |
| csiNode.tolerations | list | `[]`                                                        | CSI Node pod tolerations |
| csiNode.updateStrategy.type | string | `"RollingUpdate"`                                           | CSI Node daemonset update strategy |
| cspcOperator.annotations | object | `{}`                                                        | CSPC operator annotations |
| cspcOperator.componentName | string | `"cspc-operator"`                                           | CSPC operator component name |
| cspcOperator.cstorPool.image.registry | string | `nil`                                                       | CStor pool image registry |
| cspcOperator.cstorPool.image.repository | string | `"openebs/cstor-pool"`                                      | CStor pool image repository|
| cspcOperator.cstorPool.image.tag | string | `"3.6.0"`                                                   | CStor pool image tag |
| cspcOperator.cstorPoolExporter.image.registry | string | `nil`                                                       | CStor pool exporter image registry |
| cspcOperator.cstorPoolExporter.image.repository | string | `"openebs/m-exporter"`                                      | CStor pool exporter image repository |
| cspcOperator.cstorPoolExporter.image.tag | string | `"3.6.0"`                                                   | CStor pool exporter image tag |
| cspcOperator.image.pullPolicy | string | `"IfNotPresent"`                                            | CSPC operator image pull policy |
| cspcOperator.image.registry | string | `nil`                                                       | CSPC operator image registry |
| cspcOperator.image.repository | string | `"openebs/cspc-operator"`                                   | CSPC operator image repository |
| cspcOperator.image.tag | string | `"3.6.0"`                                                   |  CSPC operator image tag |
| cspcOperator.nodeSelector | object | `{}`                                                        |  CSPC operator pod nodeSelector|
| cspcOperator.podAnnotations | object | `{}`                                                        | CSPC operator pod annotations |
| cspcOperator.poolManager.image.registry | string | `nil`                                                       | CStor Pool Manager image registry  |
| cspcOperator.poolManager.image.repository | string | `"openebs/cstor-pool-manager"`                              | CStor Pool Manager image repository |
| cspcOperator.poolManager.image.tag | string | `"3.6.0"`                                                   | CStor Pool Manager image tag |
| cspcOperator.resources | object | `{}`                                                        | CSPC operator pod resources |
| cspcOperator.resyncInterval | string | `"30"`                                                      | CSPC operator resync interval |
| cspcOperator.securityContext | object | `{}`                                                        | CSPC operator security context |
| cspcOperator.tolerations | list | `[]`                                                        | CSPC operator pod tolerations |
| cspcOperator.baseDir | string | `"/var/openebs"`                                            | base directory for openebs cStor pools on host path to store pool related information |
| cspcOperator.sparseDir | string | `"/var/openebs/sparse"`                                     | sparse directory to access sparse based devices |
| cstorCSIPlugin.image.pullPolicy | string | `"IfNotPresent"`                                            | CStor CSI driver image pull policy |
| cstorCSIPlugin.image.registry | string | `nil`                                                       | CStor CSI driver image registry |
| cstorCSIPlugin.image.repository | string | `"openebs/cstor-csi-driver"`                                |  CStor CSI driver image repository |
| cstorCSIPlugin.image.tag | string | `"3.6.0"`                                                   | CStor CSI driver image tag |
| cstorCSIPlugin.name | string | `"cstor-csi-plugin"`                                        | CStor CSI driver container name |
| cstorCSIPlugin.remount | string | `"true"`                                                    | Enable/disable auto-remount when volume recovers from read-only state |
| cvcOperator.annotations | object | `{}`                                                        | CVC operator annotations |
| cvcOperator.componentName | string | `"cvc-operator"`                                            | CVC operator component name |
| cvcOperator.image.pullPolicy | string | `"IfNotPresent"`                                            | CVC operator image pull policy  |
| cvcOperator.image.registry | string | `nil`                                                       | CVC operator image registry |
| cvcOperator.image.repository | string | `"openebs/cvc-operator"`                                    | CVC operator image repository |
| cvcOperator.image.tag | string | `"3.6.0"`                                                   | CVC operator image tag |
| cvcOperator.logLevel | string | `"2"`                                                       |  Log level for CVC operator container (1 = least verbose, 5 = most verbose) |
| cvcOperator.nodeSelector | object | `{}`                                                        | CVC operator pod nodeSelector |
| cvcOperator.podAnnotations | object | `{}`                                                        | CVC operator pod annotations |
| cvcOperator.resources | object | `{}`                                                        |CVC operator pod resources  |
| cvcOperator.resyncInterval | string | `"30"`                                                      | CVC operator resync interval |
| cvcOperator.securityContext | object | `{}`                                                        | CVC operator security context |
| cvcOperator.target.image.registry | string | `nil`                                                       | Volume Target image registry  |
| cvcOperator.target.image.repository | string | `"openebs/cstor-istgt"`                                     | Volume Target image repository |
| cvcOperator.target.image.tag | string | `"3.6.0"`                                                   | Volume Target image tag |
| cvcOperator.tolerations | list | `[]`                                                        | CVC operator pod tolerations |
| cvcOperator.volumeExporter.image.registry | string | `nil`                                                       | Volume exporter image registry |
| cvcOperator.volumeExporter.image.repository | string | `"openebs/m-exporter"`                                      | Volume exporter image repository |
| cvcOperator.volumeExporter.image.tag | string | `"3.6.0"`                                                   | Volume exporter image tag |
| cvcOperator.volumeMgmt.image.registry | string | `nil`                                                       | Volume mgmt image registry |
| cvcOperator.volumeMgmt.image.repository | string | `"openebs/cstor-volume-manager"`                            | Volume mgmt image repository |
| cvcOperator.volumeMgmt.image.tag | string | `"3.6.0"`                                                   |  Volume mgmt image tag|
| cvcOperator.baseDir | string | `"/var/openebs"`                                            | CVC operator base directory for openebs on host path |
| imagePullSecrets | string | `nil`                                                       | Image registry pull secrets |
| openebsNDM.enabled | bool | `true`                                                      | Enable OpenEBS NDM dependency |
| openebs-ndm.featureGates.APIService.enabled | bool | `true`                                                      | Enable 'API Service' feature gate for NDM |
| openebs-ndm.featureGates.GPTBasedUUID.enabled | bool | `true`                                                      | Enable 'GPT-based UUID' feature gate for NDM |
| openebs-ndm.featureGates.UseOSDisk.enabled | bool | `false`                                                     | Enable 'Use OS-disk' feature gate for NDM |
| openebs-ndm.helperPod.image.registry | string | `nil`                                                       | Registry for helper image |
| openebs-ndm.helperPod.image.repository | string | `openebs/linux-utils`                                       | Image repository for helper pod |
| openebs-ndm.ndm.filters.enableOsDiskExcludeFilter | bool | `true`                                                      | Enable filters of OS disk exclude |
| openebs-ndm.ndm.filters.enableVendorFilter | bool | `true`                                                      | Enable filters of vendors |
| openebs-ndm.ndm.filters.excludeVendors | string | `"CLOUDBYT,OpenEBS"`                                        | Exclude devices with specified vendor |
| openebs-ndm.ndm.filters.enablePathFilter | bool | `true`                                                      | Enable filters of paths |
| openebs-ndm.ndm.filters.includePaths | string | `""`                                                        | Include devices with specified path patterns |
| openebs-ndm.ndm.filters.excludePaths | string | `"loop,fd0,sr0,/dev/ram,/dev/dm-,/dev/md,/dev/rbd,/dev/zd"` | Exclude devices with specified path patterns |
| openebs-ndm.ndm.image.registry | string | `nil`                                                       | Registry for Node Disk Manager image |
| openebs-ndm.ndm.image.repository | string | `openebs/node-disk-manager`                                 | Image repository for Node Disk Manager |
| openebs-ndm.ndm.nodeSelector | object | `{}`                                                        | Nodeselector for daemonset pods |
| openebs-ndm.ndmOperator.image.registry | string | `nil`                                                       | Registry for NDM operator image |
| openebs-ndm.ndmOperator.image.repository | string | `openebs/node-disk-operator`                                | Image repository for NDM operator |
| rbac.create | bool | `true`                                                      | Enable RBAC |
| rbac.pspEnabled | bool | `false`                                                     | Enable PodSecurityPolicy |
| release.version | string | `"3.6.0"`                                                   | Openebs CStor release version |
| serviceAccount.annotations | object | `{}`                                                        | Service Account annotations |
| serviceAccount.csiController.create | bool | `true`                                                      | Enable CSI Controller ServiceAccount |
| serviceAccount.csiController.name | string | `"openebs-cstor-csi-controller-sa"`                         | CSI Controller ServiceAccount name |
| serviceAccount.csiNode.create | bool | `true`                                                      | Enable CSI Node ServiceAccount |
| serviceAccount.csiNode.name | string | `"openebs-cstor-csi-node-sa"`                               | CSI Node ServiceAccount name |
