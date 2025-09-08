#  OpenEBS LocalPV Provisioner

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![Chart Lint and Test](https://github.com/openebs/dynamic-localpv-provisioner/workflows/Chart%20Lint%20and%20Test/badge.svg)
![Release Charts](https://github.com/openebs/dynamic-localpv-provisioner/workflows/Release%20Charts/badge.svg?branch=develop)

A Helm chart for openebs dynamic localpv provisioner. This chart bootstraps OpenEBS Dynamic LocalPV provisioner deployment on a [Kubernetes](http://kubernetes.io) cluster using the  [Helm](https://helm.sh) package manager.


**Homepage:** <http://www.openebs.io/>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| akhilerm | akhil.mohan@mayadata.io |  |
| kiranmova | kiran.mova@mayadata.io |  |
| prateekpandey14 | prateek.pandey@mayadata.io |  |


## Get Repo Info

```console
helm repo add openebs-localpv https://openebs.github.io/dynamic-localpv-provisioner
helm repo update
```

_See [helm repo](https://helm.sh/docs/helm/helm_repo/) for command documentation._

## Install Chart

Please visit the [link](https://openebs.github.io/dynamic-localpv-provisioner/) for install instructions via helm3.

```console
# Helm
helm install [RELEASE_NAME] openebs-localpv/localpv-provisioner --namespace [NAMESPACE] --create-namespace
```

_See [configuration](#configuration) below._

_See [helm install](https://helm.sh/docs/helm/helm_install/) for command documentation._

## Dependencies

By default this chart installs additional, dependent charts:

| Repository | Name | Version |
|------------|------|---------|
| https://openebs.github.io/node-disk-manager | openebs-ndm | 2.1.0   |

**Note:** Find detailed Node Disk Manager Helm chart configuration options [here](https://github.com/openebs/node-disk-manager/blob/master/deploy/helm/charts/README.md).


To disable the dependency during installation, set `openebsNDM.enabled` to `false`.

_See [helm dependency](https://helm.sh/docs/helm/helm_dependency/) for command documentation._

## Uninstall Chart

```console
# Helm
helm uninstall [RELEASE_NAME] --namespace [NAMESPACE]
```

This removes all the Kubernetes components associated with the chart and deletes the release.

_See [helm uninstall](https://helm.sh/docs/helm/helm_uninstall/) for command documentation._

## Upgrading Chart

```console
# Helm
helm upgrade [RELEASE_NAME] [CHART] --install --namespace [NAMESPACE]
```


## Configuration

The following table lists the configurable parameters of the OpenEBS Dynamic LocalPV Provisioner chart and their default values.

You can modify different parameters by specifying the desired value in the `helm install` command by using the `--set` and/or the `--set-string` flag(s). You can modify the parameters of the [Node Disk Manager chart](https://openebs.github.io/node-disk-manager) by adding `openebs-ndm` before the desired parameter in the `helm install` command.

In the following sample command we modify `deviceClass.fsType` from the localpv-provisioner chart and `ndm.nodeSelector` from the openebs-ndm chart to only schedule openebs-ndm DaemonSet pods on nodes labelled with `openebs.io/data-plane=true`. We also enable the 'Use OS-disk' feature gate using the `featureGates.UseOSDisk.enabled` parameter from the openebs-ndm chart.


```console
helm install openebs-localpv openebs-localpv/localpv-provisioner --namespace openebs --create-namespace \
	--set-string deviceClass.fsType="xfs" \
	--set-string openebs-ndm.ndm.nodeSelector."openebs\.io/data-plane"=true \
	--set openebs-ndm.featureGates.UseOSDisk.enabled=true
```

Sample command to install the provisioner with nodeAffinityLabels "openebs.io/node-affinity-key-1" and "openebs.io/node-affinity-key-2" on the hostpath StorageClass:
```console
helm install openebs-localpv openebs-localpv/localpv-provisioner --namespace openebs --create-namespace \
	--set-string hostpathClass.nodeAffinityLabels="{openebs.io/node-affinity-key-1,openebs.io/node-affinity-key-2}"
```

Sample command to install the provisioner with blockDeviceSelectors "openebs.io/block-device-tag=mongo" and "ndm.io/fsType=ext4":
```console
helm install openebs-localpv openebs-localpv/localpv-provisioner --namespace openebs --create-namespace \
	--set-string deviceClass.blockDeviceSelectors."openebs\.io/block-device-tag"="mongo" \
	--set-string deviceClass.blockDeviceSelectors."ndm\.io/fsType"="ext4"
```

| Parameter                                   | Description                                   | Default                       |
| ------------------------------------------- | --------------------------------------------- |-------------------------------|
| `release.version`                           | LocalPV Provisioner release version               | `3.5.0`                       |
| `analytics.enabled`                         | Enable sending stats to Google Analytics          | `true`                        |
| `analytics.pingInterval`                    | Duration(hours) between sending ping stat         | `24h`                         |
| `deviceClass.blockDeviceSelectors`          | Label key value pairs based on which BlockDevices on the node will be selected for provisioning   | `{}`                          |
| `deviceClass.enabled`                       | Enables creation of default Device StorageClass   | `true`                        |
| `deviceClass.fsType`                        | Filesystem type for openebs-device StorageClass   | `"ext4"`                      |
| `deviceClass.isDefaultClass`                | Make openebs-device the default StorageClass      | `"false"`                     |
| `deviceClass.nodeAffinityLabels`          | Custom node label(or labels) key to uniquely identify nodes. `kubernetes.io/hostname` is the default label key for node selection. | `[]`                          |
| `deviceClass.reclaimPolicy`                 | ReclaimPolicy for Device PVs                      | `"Delete"`                    |
| `helperPod.image.registry`                  | Registry for helper image                         | `""`                          |
| `helperPod.image.repository`                | Image for helper pod                              | `"openebs/linux-utils"`       |
| `helperPod.image.pullPolicy`                | Pull policy for helper pod                        | `"IfNotPresent"`              |
| `helperPod.image.tag`                       | Image tag for helper image                        | `3.5.0`                       |
| `hostpathClass.basePath`                    | BasePath for openebs-hostpath StorageClass        | `"/var/openebs/local"`        |
| `hostpathClass.enabled`                     | Enables creation of default Hostpath StorageClass | `true`                        |
| `hostpathClass.isDefaultClass`              | Make openebs-hostpath the default StorageClass    | `"false"`                     |
| `hostpathClass.nodeAffinityLabels`          | Custom node label(or labels) key to uniquely identify nodes. `kubernetes.io/hostname` is the default label key for node selection. | `[]`                          |
| `hostpathClass.xfsQuota.enabled`            | Enable XFS Quota (requires XFS filesystem)        | `false`                       |
| `hostpathClass.ext4Quota.enabled`            | Enable EXT4 Quota (requires EXT4 filesystem)     | `false`                       |
| `hostpathClass.reclaimPolicy`               | ReclaimPolicy for Hostpath PVs                    | `"Delete"`                    |
| `imagePullSecrets`                          | Provides image pull secrect                       | `""`                          |
| `localpv.enabled`                           | Enable LocalPV Provisioner                        | `true`                        |
| `localpv.image.registry`                    | Registry for LocalPV Provisioner image            | `""`                          |
| `localpv.image.repository`                  | Image repository for LocalPV Provisioner          | `openebs/localpv-provisioner` |
| `localpv.image.pullPolicy`                  | Image pull policy for LocalPV Provisioner         | `IfNotPresent`                |
| `localpv.image.tag`                         | Image tag for LocalPV Provisioner                 | `3.5.0`                       |
| `localpv.updateStrategy.type`               | Update strategy for LocalPV Provisioner           | `RollingUpdate`               |
| `localpv.annotations`                       | Annotations for LocalPV Provisioner metadata      | `""`                          |
| `localpv.podAnnotations`                    | Annotations for LocalPV Provisioner pods metadata | `""`                          |
| `localpv.privileged`                        | Run LocalPV Provisioner with extra privileges     | `true`                        |
| `localpv.resources`                         | Resource and request and limit for containers     | `""`                          |
| `localpv.podLabels`                         | Appends labels to the pods                        | `""`                          |
| `localpv.nodeSelector`                      | Nodeselector for LocalPV Provisioner pods         | `""`                          |
| `localpv.tolerations`                       | LocalPV Provisioner pod toleration values         | `""`                          |
| `localpv.securityContext`                   | Seurity context for container                     | `""`                          |
| `localpv.healthCheck.initialDelaySeconds`   | Delay before liveness probe is initiated          | `30`                          |
| `localpv.healthCheck.periodSeconds`         | How often to perform the liveness probe           | `60`                          |
| `localpv.replicas`                          | No. of LocalPV Provisioner replica                | `1`                           |
| `localpv.enableLeaderElection`              | Enable leader election                            | `true`                        |
| `localpv.affinity`                          | LocalPV Provisioner pod affinity                  | `{}`                          |
| `localpv.waitForBDBindTimeoutRetryCount`    | This sets the number of times the provisioner should try with a polling interval of 5 seconds, to get the Blockdevice Name from a BlockDeviceClaim, before the BlockDeviceClaim is deleted. | "12"                          |
| `openebsNDM.enabled`                        | Install openebs NDM dependency                    | `true`                        |
| `rbac.create`                               | Enable RBAC Resources                             | `true`                        |
| `rbac.pspEnabled`                           | Create pod security policy resources              | `false`                       |


A YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```bash
helm install <release-name> -f values.yaml --namespace openebs openebs-localpv/localpv-provisioner
```

> **Tip**: You can use the default [values.yaml](values.yaml)
