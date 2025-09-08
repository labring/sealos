## :warning: Compatibility

The OpenEBS helm chart now supports the installation of Mayastor. Please note the following before installing Mayastor:
1. Mayastor is incompatible with NDM (openebs-ndm) and cStor (cstor). Installing Mayastor alongside NDM and cStor may cause it to behave in unexpected ways.
2. A `helm install` with the `--set mayastor.enabled=true` option set will not deploy the LocalPV Provisioner and NDM.
3. A `helm upgrade` with the `--set mayastor.enabled=true` option set will remove the LocalPV Provisioner and NDM, if they are present. This does not affect any LocalPV volumes you have already provisioned, they will continue to work as expected.
4. Mayastor deployment scenarios involving other OpenEBS storage engines are not tested. It is recommended that you do not install Mayastor along with other storage engines. 

# OpenEBS Helm Chart

[OpenEBS](https://openebs.io) helps Developers and Platform SREs easily deploy Kubernetes Stateful Workloads that require fast and highly reliable container attached storage. OpenEBS can be deployed on any Kubernetes cluster - either in cloud, on-premise (virtual or bare metal) or developer laptop (minikube).

OpenEBS Data Engines and Control Plane are implemented as micro-services, deployed as containers and orchestrated by Kubernetes itself. An added advantage of being a completely Kubernetes native solution is that administrators and developers can interact and manage OpenEBS using all the wonderful tooling that is available for Kubernetes like kubectl, Helm, Prometheus, Grafana, etc.

OpenEBS turns any storage available on the Kubernetes worker nodes into local or distributed Kubernetes Persistent Volumes.
* Local Volumes are accessible only from a single node in the cluster. Pods using Local Volume have to be scheduled on the node where volume is provisioned. Local Volumes are typically preferred for distributed workloads like Cassandra, MongoDB, Elastic, etc that are distributed in nature and have high availability built into them. Depending on the type of storage attached to your Kubernetes worker nodes, you can select from different flavors of Dynamic Local PV - Hostpath, Device, LVM, ZFS or Rawfile.
* Replicated Volumes as the name suggests, are those that have their data synchronously replicated to multiple nodes. Volumes can sustain node failures. The replication also can be setup across availability zones helping applications move across availability zones. Depending on the type of storage attached to your Kubernetes worker nodes and application performance requirements, you can select from Jiva, cStor or Mayastor.

## Documentation and user guides

You can run OpenEBS on any Kubernetes 1.21+ cluster in a matter of minutes. See the [Quickstart Guide to OpenEBS](https://openebs.io/) for detailed instructions.

## Getting started

### How to customize OpenEBS Helm chart?

OpenEBS helm chart is an umbrella chart that pulls together engine specific charts. The engine charts are included as dependencies. 
arts/openebs/Chart.yaml). 
OpenEBS helm chart will includes common components that are used by multiple engines like:
- Node Disk Manager related components
- Dynamic Local Provisioner related components
- Security Policies like RBAC, PSP, Kyverno 

```bash
openebs
├── (default) openebs-ndm
├── (default) localpv-provisioner
├── mayastor
├── jiva
├── cstor
├── zfs-localpv
└── lvm-localpv
└── nfs-provisioner
```

To install the engine charts, the helm install must be provided with a engine enabled flag like `cstor.enabled=true` or `zfs-localpv.enabled=true` or by passing a custom values.yaml with required engines enabled.

### Prerequisites

- Kubernetes 1.18+ with RBAC enabled
- When using cstor and jiva engines, iSCSI utils must be installed on all the nodes where stateful pods are going to run. 
- Depending on the engine and type of platform, you may have to customize the values or run additional pre-requisistes. Refer to [documentation](https://openebs.io).

### Setup Helm Repository

Before installing OpenEBS Helm charts, you need to add the [OpenEBS Helm repository](https://openebs.github.io/charts) to your Helm client.

```bash
helm repo add openebs https://openebs.github.io/charts
helm repo update
```

### Installing OpenEBS 

```bash
helm install --name `my-release` --namespace openebs openebs/openebs --create-namespace
```

Examples:
- Assuming the release will be called openebs, the command would be:
  ```bash
  helm install --name openebs --namespace openebs openebs/openebs --create-namespace
  ```
- To install OpenEBS with mayastor CSI driver, run 
  ```bash
  helm install openebs openebs/openebs --namespace openebs --create-namespace --set mayastor.enabled=true
  ```
> **Note:** : mayastor will be installed without the default openebs engines

- To install OpenEBS with cStor CSI driver, run
  ```bash
  helm install openebs openebs/openebs --namespace openebs --create-namespace --set cstor.enabled=true
  ```

- To install/enable a new engine on the installed helm release `openebs`, you can run the helm upgrade command as follows:
  ```bash
  helm upgrade openebs openebs/openebs --namespace openebs --reuse-values --set jiva.enabled=true 
  ```

- To disable legacy out of tree jiva and cstor provisioners, run the following command.
  ```bash
  helm upgrade openebs openebs/openebs --namespace openebs --reuse-values --set legacy.enabled=false 
  ```

### To uninstall/delete instance with release name

```bash
helm ls --all
helm delete `my-release`
```

> **Tip**: Prior to deleting the helm chart, make sure all the storage volumes and pools are deleted.

## Configuration

The following table lists the common configurable parameters of the OpenEBS chart and their default values. For a full list of configurable parameters check out the [values.yaml](https://github.com/openebs/charts/blob/HEAD/charts/openebs/values.yaml).

| Parameter                                   | Description                                                                  | Default                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `apiserver.enabled`                         | Enable API Server                                                            | `true`                                                                   |
| `apiserver.image`                           | Image for API Server                                                         | `openebs/m-apiserver`                                                    |
| `apiserver.imageTag`                        | Image Tag for API Server                                                     | `2.12.2`                                                                 |
| `cleanup.image.registry`                    | Cleanup pre hook image registry                                              | `nil`                                                                    |
| `cleanup.image.repository`                  | Cleanup pre hook image repository                                            | `"bitnami/kubectl"`                                                      |
| `cleanup.image.tag`                         | Cleanup pre hook image tag                                                   | `if not provided determined by the k8s version`                          |
| `crd.enableInstall`                         | Enable installation of CRDs by OpenEBS                                       | `true`                                                                   |
| `cstor.pool.image`                          | Image for cStor Pool                                                         | `openebs/cstor-pool`                                                     |
| `cstor.pool.imageTag`                       | Image Tag for cStor Pool                                                     | `2.12.2`                                                                 |
| `cstor.poolMgmt.image`                      | Image for cStor Pool  Management                                             | `openebs/cstor-pool-mgmt`                                                |
| `cstor.poolMgmt.imageTag`                   | Image Tag for cStor Pool Management                                          | `2.12.2`                                                                 |
| `cstor.target.image`                        | Image for cStor Target                                                       | `openebs/cstor-istgt`                                                    |
| `cstor.target.imageTag`                     | Image Tag for cStor Target                                                   | `2.12.2`                                                                 |
| `cstor.volumeMgmt.image`                    | Image for cStor Volume  Management                                           | `openebs/cstor-volume-mgmt`                                              |
| `cstor.volumeMgmt.imageTag`                 | Image Tag for cStor Volume Management                                        | `2.12.2`                                                                 |
| `defaultStorageConfig.enabled`              | Enable default storage class installation                                    | `true`                                                                   |
| `featureGates.enabled`                      | Enable feature gates                                                         | `true`                                                                   |
| `featureGates.GPTBasedUUID.enabled`         | Enable feature gate : GPTBasedUUID                                           | `true`                                                                   |
| `featureGates.APIService.enabled`           | Enable feature gate : APIService                                             | `false`                                                                  |
| `featureGates.UseOSDisk.enabled`            | Enable feature gate : UseOSDisk                                              | `false`                                                                  |
| `featureGates.ChangeDetection.enabled`      | Enable feature gate : ChangeDetection                                        | `false`                                                                  |
| `healthCheck.initialDelaySeconds`           | Delay before liveness probe is initiated                                     | `30`                                                                     |
| `healthCheck.periodSeconds`                 | How often to perform the liveness probe                                      | `60`                                                                     |
| `helper.image`                              | Image for helper                                                             | `openebs/linux-utils`                                                    |
| `helper.imageTag`                           | Image Tag for helper                                                         | `3.4.0`                                                                  |
| `image.pullPolicy`                          | Container pull policy                                                        | `IfNotPresent`                                                           |
| `image.repository`                          | Specify which docker registry to use                                         | `""`                                                                     |
| `jiva.defaultStoragePath`                   | hostpath used by default Jiva StorageClass                                   | `/var/openebs`                                                           |
| `jiva.image`                                | Image for Jiva                                                               | `openebs/jiva`                                                           |
| `jiva.imageTag`                             | Image Tag for Jiva                                                           | `2.12.2`                                                                 |
| `jiva.replicas`                             | Number of Jiva Replicas                                                      | `3`                                                                      |
| `localprovisioner.basePath`                 | BasePath for hostPath volumes on Nodes                                       | `/var/openebs/local`                                                     |
| `localprovisioner.enabled`                  | Enable localProvisioner                                                      | `true`                                                                   |
| `localprovisioner.image`                    | Image for localProvisioner                                                   | `openebs/provisioner-localpv`                                            |
| `localprovisioner.imageTag`                 | Image Tag for localProvisioner                                               | `3.5.0`                                                                  |
| `mayastor.enabled`                          | Enable mayastor (disables localprovisioner and ndm)                          | `false`                                                                  |
| `mayastor.etcd.replicaCount`                | Set the number of etcd replicas in the                                       | `3`                                                                      |
| `mayastor.etcd.persistence.storageClass`    | Set the StorageClass name used to provision the volume(s) for the etcd       | `""`                                                                     |
| `mayastor.etcd.persistence.size`            | Set the size of the volume(s) used by the etcd                               | `""`                                                                     |
| `mayastor.image.registry`                   | Set the container image registry for the mayastor containers                 | `"docker.io"`                                                            |
| `mayastor.image.repo`                       | Set the container image repository for the mayastor containers               | `"openebs"`                                                              |
| `mayastor.image.tag`                        | Set the container image tag for the mayastor containers                      | `"v2.5.0"`                                                          |
| `mayastor.image.pullPolicy`                 | Set the container ImagePullPolicy for the mayastor containers                | `"Always"`                                                               |
| `mayastor.csi.image.registry`               | Set the container image registry for the Kubernetes CSI sidecar containers   | `"registry.k8s.io"`                                                      |
| `mayastor.csi.image.repo`                   | Set the container image repository for the Kubernetes CSI sidecar containers | `"sig-storage"`                                                          |
| `mayastor.csi.image.pullPolicy`             | Set the container ImagePullPolicy for the Kubernetes CSI sidecar containers  | `"IfNotPresent"`                                                         |
| `mayastor.csi.node.kubeletDir`              | Set kubelet directory for Kubernetes CSI plugin registration                 | `"/var/lib/kubelet"`                                                     |
| `mayastor.base.jaeger.enabled`              | Enable Jaeger tracing for mayastor                                           | `"false"`                                                                |
| `mayastor.jaeger-operator.jaeger.create`    | Create Jaeger operator                                                       | `"false"`                                                                |
| `mayastor.jaeger-operator.crd.install`      | Create Jaeger CustomResourceDefinition                                       | `"false"`                                                                |
| `mayastor.jaeger-operator.rbac.clusterRole` | Create Jaeger Kubernetes RBAC ClusterRole                                    | `"true"`                                                                 |
| `mayastor.loki-stack.enabled`               | Enable loki log collection for Mayastor components                           | `"true"`                                                                 |
| `mayastor.loki-stack.promtail.enabled`      | Enables promtail for scraping logs from nodes components                     | `"true"`                                                                 |
| `ndm.enabled`                               | Enable Node Disk Manager                                                     | `true`                                                                   |
| `ndm.filters.enableOsDiskExcludeFilter`     | Enable filters of OS disk exclude                                            | `true`                                                                   |
| `ndm.filters.enablePathFilter`              | Enable filters of paths                                                      | `true`                                                                   |
| `ndm.filters.enableVendorFilter`            | Enable filters of vendors                                                    | `true`                                                                   |
| `ndm.filters.excludePaths`                  | Exclude devices with specified path patterns                                 | `/dev/loop,/dev/fd0,/dev/sr0,/dev/ram,/dev/dm-,/dev/md,/dev/rbd,/dev/zd` |
| `ndm.filters.excludeVendors`                | Exclude devices with specified vendor                                        | `CLOUDBYT,OpenEBS`                                                       |
| `ndm.filters.includePaths`                  | Include devices with specified path patterns                                 | `""`                                                                     |
| `ndm.filters.osDiskExcludePaths`            | Paths/Mounts to be excluded by OS Disk Filter                                | `/,/etc/hosts,/boot`                                                     |
| `ndm.image`                                 | Image for Node Disk Manager                                                  | `openebs/node-disk-manager`                                              |
| `ndm.imageTag`                              | Image Tag for Node Disk Manager                                              | `2.1.0`                                                                  |
| `ndmOperator.enabled`                       | Enable NDM Operator                                                          | `true`                                                                   |
| `ndmOperator.image`                         | Image for NDM Operator                                                       | `openebs/node-disk-operator`                                             |
| `ndmOperator.imageTag`                      | Image Tag for NDM Operator                                                   | `2.1.0`                                                                  |
| `ndm.probes.enableSeachest`                 | Enable Seachest probe for NDM                                                | `false`                                                                  |
| `policies.monitoring.image`                 | Image for Prometheus Exporter                                                | `openebs/m-exporter`                                                     |
| `policies.monitoring.imageTag`              | Image Tag for Prometheus Exporter                                            | `2.12.2`                                                                 |
| `provisioner.enabled`                       | Enable Provisioner                                                           | `true`                                                                   |
| `provisioner.image`                         | Image for Provisioner                                                        | `openebs/openebs-k8s-provisioner`                                        |
| `provisioner.imageTag`                      | Image Tag for Provisioner                                                    | `2.12.2`                                                                 |
| `rbac.create`                               | Enable RBAC Resources                                                        | `true`                                                                   |
| `rbac.kyvernoEnabled`                       | Create Kyverno policy resources                                              | `false`                                                                  |
| `rbac.pspEnabled`                           | Create pod security policy resources                                         | `false`                                                                  |
| `snapshotOperator.controller.image`         | Image for Snapshot Controller                                                | `openebs/snapshot-controller`                                            |
| `snapshotOperator.controller.imageTag`      | Image Tag for Snapshot Controller                                            | `2.12.2`                                                                 |
| `snapshotOperator.enabled`                  | Enable Snapshot Provisioner                                                  | `true`                                                                   |
| `snapshotOperator.provisioner.image`        | Image for Snapshot Provisioner                                               | `openebs/snapshot-provisioner`                                           |
| `snapshotOperator.provisioner.imageTag`     | Image Tag for Snapshot Provisioner                                           | `2.12.2`                                                                 |
| `varDirectoryPath.baseDir`                  | To store debug info of OpenEBS containers                                    | `/var/openebs`                                                           |
| `webhook.enabled`                           | Enable admission server                                                      | `true`                                                                   |
| `webhook.hostNetwork`                       | Use hostNetwork in admission server                                          | `false`                                                                  |
| `webhook.image`                             | Image for admission server                                                   | `openebs/admission-server`                                               |
| `webhook.imageTag`                          | Image Tag for admission server                                               | `2.12.2`                                                                 |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`.

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```bash
helm install --name `my-release` -f values.yaml --namespace openebs openebs/openebs --create-namespace
```

> **Tip**: You can use the default [values.yaml](values.yaml)
