<!--- app-name: Etcd -->

# Etcd packaged by Bitnami

etcd is a distributed key-value store designed to securely store data across a cluster. etcd is widely used in production on account of its reliability, fault-tolerance and ease of use.

[Overview of Etcd](https://etcd.io/)

Trademarks: This software listing is packaged by Bitnami. The respective trademarks mentioned in the offering are owned by the respective companies, and use of them does not imply any affiliation or endorsement.
                           
## TL;DR

```console
$ helm repo add my-repo https://charts.bitnami.com/bitnami
$ helm install my-release my-repo/etcd
```

## Introduction

This chart bootstraps a [etcd](https://github.com/bitnami/containers/tree/main/bitnami/etcd) deployment on a [Kubernetes](https://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.

Bitnami charts can be used with [Kubeapps](https://kubeapps.dev/) for deployment and management of Helm Charts in clusters.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure

## Installing the Chart

To install the chart with the release name `my-release`:

```console
$ helm repo add my-repo https://charts.bitnami.com/bitnami
$ helm install my-release my-repo/etcd
```

These commands deploy etcd on the Kubernetes cluster in the default configuration. The [Parameters](#parameters) section lists the parameters that can be configured during installation.

> **Tip**: List all releases using `helm list`

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```console
$ helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Parameters

### Global parameters

| Name                      | Description                                     | Value |
| ------------------------- | ----------------------------------------------- | ----- |
| `global.imageRegistry`    | Global Docker image registry                    | `""`  |
| `global.imagePullSecrets` | Global Docker registry secret names as an array | `[]`  |
| `global.storageClass`     | Global StorageClass for Persistent Volume(s)    | `""`  |


### Common parameters

| Name                     | Description                                                                                  | Value           |
| ------------------------ | -------------------------------------------------------------------------------------------- | --------------- |
| `kubeVersion`            | Force target Kubernetes version (using Helm capabilities if not set)                         | `""`            |
| `nameOverride`           | String to partially override common.names.fullname template (will maintain the release name) | `""`            |
| `fullnameOverride`       | String to fully override common.names.fullname template                                      | `""`            |
| `commonLabels`           | Labels to add to all deployed objects                                                        | `{}`            |
| `commonAnnotations`      | Annotations to add to all deployed objects                                                   | `{}`            |
| `clusterDomain`          | Default Kubernetes cluster domain                                                            | `cluster.local` |
| `extraDeploy`            | Array of extra objects to deploy with the release                                            | `[]`            |
| `diagnosticMode.enabled` | Enable diagnostic mode (all probes will be disabled and the command will be overridden)      | `false`         |
| `diagnosticMode.command` | Command to override all containers in the deployment                                         | `["sleep"]`     |
| `diagnosticMode.args`    | Args to override all containers in the deployment                                            | `["infinity"]`  |


### etcd parameters

| Name                                   | Description                                                                                                 | Value                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------- |
| `image.registry`                       | etcd image registry                                                                                         | `docker.io`           |
| `image.repository`                     | etcd image name                                                                                             | `bitnami/etcd`        |
| `image.tag`                            | etcd image tag                                                                                              | `3.5.6-debian-11-r10` |
| `image.digest`                         | etcd image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag        | `""`                  |
| `image.pullPolicy`                     | etcd image pull policy                                                                                      | `IfNotPresent`        |
| `image.pullSecrets`                    | etcd image pull secrets                                                                                     | `[]`                  |
| `image.debug`                          | Enable image debug mode                                                                                     | `false`               |
| `auth.rbac.create`                     | Switch to enable RBAC authentication                                                                        | `true`                |
| `auth.rbac.allowNoneAuthentication`    | Allow to use etcd without configuring RBAC authentication                                                   | `true`                |
| `auth.rbac.rootPassword`               | Root user password. The root user is always `root`                                                          | `""`                  |
| `auth.rbac.existingSecret`             | Name of the existing secret containing credentials for the root user                                        | `""`                  |
| `auth.rbac.existingSecretPasswordKey`  | Name of key containing password to be retrieved from the existing secret                                    | `""`                  |
| `auth.token.type`                      | Authentication token type. Allowed values: 'simple' or 'jwt'                                                | `jwt`                 |
| `auth.token.privateKey.filename`       | Name of the file containing the private key for signing the JWT token                                       | `jwt-token.pem`       |
| `auth.token.privateKey.existingSecret` | Name of the existing secret containing the private key for signing the JWT token                            | `""`                  |
| `auth.token.signMethod`                | JWT token sign method                                                                                       | `RS256`               |
| `auth.token.ttl`                       | JWT token TTL                                                                                               | `10m`                 |
| `auth.client.secureTransport`          | Switch to encrypt client-to-server communications using TLS certificates                                    | `false`               |
| `auth.client.useAutoTLS`               | Switch to automatically create the TLS certificates                                                         | `false`               |
| `auth.client.existingSecret`           | Name of the existing secret containing the TLS certificates for client-to-server communications             | `""`                  |
| `auth.client.enableAuthentication`     | Switch to enable host authentication using TLS certificates. Requires existing secret                       | `false`               |
| `auth.client.certFilename`             | Name of the file containing the client certificate                                                          | `cert.pem`            |
| `auth.client.certKeyFilename`          | Name of the file containing the client certificate private key                                              | `key.pem`             |
| `auth.client.caFilename`               | Name of the file containing the client CA certificate                                                       | `""`                  |
| `auth.peer.secureTransport`            | Switch to encrypt server-to-server communications using TLS certificates                                    | `false`               |
| `auth.peer.useAutoTLS`                 | Switch to automatically create the TLS certificates                                                         | `false`               |
| `auth.peer.existingSecret`             | Name of the existing secret containing the TLS certificates for server-to-server communications             | `""`                  |
| `auth.peer.enableAuthentication`       | Switch to enable host authentication using TLS certificates. Requires existing secret                       | `false`               |
| `auth.peer.certFilename`               | Name of the file containing the peer certificate                                                            | `cert.pem`            |
| `auth.peer.certKeyFilename`            | Name of the file containing the peer certificate private key                                                | `key.pem`             |
| `auth.peer.caFilename`                 | Name of the file containing the peer CA certificate                                                         | `""`                  |
| `autoCompactionMode`                   | Auto compaction mode, by default periodic. Valid values: "periodic", "revision".                            | `""`                  |
| `autoCompactionRetention`              | Auto compaction retention for mvcc key value store in hour, by default 0, means disabled                    | `""`                  |
| `initialClusterState`                  | Initial cluster state. Allowed values: 'new' or 'existing'                                                  | `""`                  |
| `logLevel`                             | Sets the log level for the etcd process. Allowed values: 'debug', 'info', 'warn', 'error', 'panic', 'fatal' | `info`                |
| `maxProcs`                             | Limits the number of operating system threads that can execute user-level                                   | `""`                  |
| `removeMemberOnContainerTermination`   | Use a PreStop hook to remove the etcd members from the etcd cluster on container termination                | `true`                |
| `configuration`                        | etcd configuration. Specify content for etcd.conf.yml                                                       | `""`                  |
| `existingConfigmap`                    | Existing ConfigMap with etcd configuration                                                                  | `""`                  |
| `extraEnvVars`                         | Extra environment variables to be set on etcd container                                                     | `[]`                  |
| `extraEnvVarsCM`                       | Name of existing ConfigMap containing extra env vars                                                        | `""`                  |
| `extraEnvVarsSecret`                   | Name of existing Secret containing extra env vars                                                           | `""`                  |
| `command`                              | Default container command (useful when using custom images)                                                 | `[]`                  |
| `args`                                 | Default container args (useful when using custom images)                                                    | `[]`                  |


### etcd statefulset parameters

| Name                                                | Description                                                                               | Value           |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------- |
| `replicaCount`                                      | Number of etcd replicas to deploy                                                         | `1`             |
| `updateStrategy.type`                               | Update strategy type, can be set to RollingUpdate or OnDelete.                            | `RollingUpdate` |
| `podManagementPolicy`                               | Pod management policy for the etcd statefulset                                            | `Parallel`      |
| `hostAliases`                                       | etcd pod host aliases                                                                     | `[]`            |
| `lifecycleHooks`                                    | Override default etcd container hooks                                                     | `{}`            |
| `containerPorts.client`                             | Client port to expose at container level                                                  | `2379`          |
| `containerPorts.peer`                               | Peer port to expose at container level                                                    | `2380`          |
| `podSecurityContext.enabled`                        | Enabled etcd pods' Security Context                                                       | `true`          |
| `podSecurityContext.fsGroup`                        | Set etcd pod's Security Context fsGroup                                                   | `1001`          |
| `containerSecurityContext.enabled`                  | Enabled etcd containers' Security Context                                                 | `true`          |
| `containerSecurityContext.runAsUser`                | Set etcd container's Security Context runAsUser                                           | `1001`          |
| `containerSecurityContext.runAsNonRoot`             | Set etcd container's Security Context runAsNonRoot                                        | `true`          |
| `containerSecurityContext.allowPrivilegeEscalation` | Force the child process to be run as nonprivilege                                         | `false`         |
| `resources.limits`                                  | The resources limits for the etcd container                                               | `{}`            |
| `resources.requests`                                | The requested resources for the etcd container                                            | `{}`            |
| `livenessProbe.enabled`                             | Enable livenessProbe                                                                      | `true`          |
| `livenessProbe.initialDelaySeconds`                 | Initial delay seconds for livenessProbe                                                   | `60`            |
| `livenessProbe.periodSeconds`                       | Period seconds for livenessProbe                                                          | `30`            |
| `livenessProbe.timeoutSeconds`                      | Timeout seconds for livenessProbe                                                         | `5`             |
| `livenessProbe.failureThreshold`                    | Failure threshold for livenessProbe                                                       | `5`             |
| `livenessProbe.successThreshold`                    | Success threshold for livenessProbe                                                       | `1`             |
| `readinessProbe.enabled`                            | Enable readinessProbe                                                                     | `true`          |
| `readinessProbe.initialDelaySeconds`                | Initial delay seconds for readinessProbe                                                  | `60`            |
| `readinessProbe.periodSeconds`                      | Period seconds for readinessProbe                                                         | `10`            |
| `readinessProbe.timeoutSeconds`                     | Timeout seconds for readinessProbe                                                        | `5`             |
| `readinessProbe.failureThreshold`                   | Failure threshold for readinessProbe                                                      | `5`             |
| `readinessProbe.successThreshold`                   | Success threshold for readinessProbe                                                      | `1`             |
| `startupProbe.enabled`                              | Enable startupProbe                                                                       | `false`         |
| `startupProbe.initialDelaySeconds`                  | Initial delay seconds for startupProbe                                                    | `0`             |
| `startupProbe.periodSeconds`                        | Period seconds for startupProbe                                                           | `10`            |
| `startupProbe.timeoutSeconds`                       | Timeout seconds for startupProbe                                                          | `5`             |
| `startupProbe.failureThreshold`                     | Failure threshold for startupProbe                                                        | `60`            |
| `startupProbe.successThreshold`                     | Success threshold for startupProbe                                                        | `1`             |
| `customLivenessProbe`                               | Override default liveness probe                                                           | `{}`            |
| `customReadinessProbe`                              | Override default readiness probe                                                          | `{}`            |
| `customStartupProbe`                                | Override default startup probe                                                            | `{}`            |
| `extraVolumes`                                      | Optionally specify extra list of additional volumes for etcd pods                         | `[]`            |
| `extraVolumeMounts`                                 | Optionally specify extra list of additional volumeMounts for etcd container(s)            | `[]`            |
| `initContainers`                                    | Add additional init containers to the etcd pods                                           | `[]`            |
| `sidecars`                                          | Add additional sidecar containers to the etcd pods                                        | `[]`            |
| `podAnnotations`                                    | Annotations for etcd pods                                                                 | `{}`            |
| `podLabels`                                         | Extra labels for etcd pods                                                                | `{}`            |
| `podAffinityPreset`                                 | Pod affinity preset. Ignored if `affinity` is set. Allowed values: `soft` or `hard`       | `""`            |
| `podAntiAffinityPreset`                             | Pod anti-affinity preset. Ignored if `affinity` is set. Allowed values: `soft` or `hard`  | `soft`          |
| `nodeAffinityPreset.type`                           | Node affinity preset type. Ignored if `affinity` is set. Allowed values: `soft` or `hard` | `""`            |
| `nodeAffinityPreset.key`                            | Node label key to match. Ignored if `affinity` is set.                                    | `""`            |
| `nodeAffinityPreset.values`                         | Node label values to match. Ignored if `affinity` is set.                                 | `[]`            |
| `affinity`                                          | Affinity for pod assignment                                                               | `{}`            |
| `nodeSelector`                                      | Node labels for pod assignment                                                            | `{}`            |
| `tolerations`                                       | Tolerations for pod assignment                                                            | `[]`            |
| `terminationGracePeriodSeconds`                     | Seconds the pod needs to gracefully terminate                                             | `""`            |
| `schedulerName`                                     | Name of the k8s scheduler (other than default)                                            | `""`            |
| `priorityClassName`                                 | Name of the priority class to be used by etcd pods                                        | `""`            |
| `runtimeClassName`                                  | Name of the runtime class to be used by pod(s)                                            | `""`            |
| `shareProcessNamespace`                             | Enable shared process namespace in a pod.                                                 | `false`         |
| `topologySpreadConstraints`                         | Topology Spread Constraints for pod assignment                                            | `[]`            |
| `persistentVolumeClaimRetentionPolicy.enabled`      | Controls if and how PVCs are deleted during the lifecycle of a StatefulSet                | `false`         |
| `persistentVolumeClaimRetentionPolicy.whenScaled`   | Volume retention behavior when the replica count of the StatefulSet is reduced            | `Retain`        |
| `persistentVolumeClaimRetentionPolicy.whenDeleted`  | Volume retention behavior that applies when the StatefulSet is deleted                    | `Retain`        |


### Traffic exposure parameters

| Name                               | Description                                                                        | Value       |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ----------- |
| `service.type`                     | Kubernetes Service type                                                            | `ClusterIP` |
| `service.enabled`                  | create second service if equal true                                                | `true`      |
| `service.clusterIP`                | Kubernetes service Cluster IP                                                      | `""`        |
| `service.ports.client`             | etcd client port                                                                   | `2379`      |
| `service.ports.peer`               | etcd peer port                                                                     | `2380`      |
| `service.nodePorts.client`         | Specify the nodePort client value for the LoadBalancer and NodePort service types. | `""`        |
| `service.nodePorts.peer`           | Specify the nodePort peer value for the LoadBalancer and NodePort service types.   | `""`        |
| `service.clientPortNameOverride`   | etcd client port name override                                                     | `""`        |
| `service.peerPortNameOverride`     | etcd peer port name override                                                       | `""`        |
| `service.loadBalancerIP`           | loadBalancerIP for the etcd service (optional, cloud specific)                     | `""`        |
| `service.loadBalancerSourceRanges` | Load Balancer source ranges                                                        | `[]`        |
| `service.externalIPs`              | External IPs                                                                       | `[]`        |
| `service.externalTrafficPolicy`    | %%MAIN_CONTAINER_NAME%% service external traffic policy                            | `Cluster`   |
| `service.extraPorts`               | Extra ports to expose (normally used with the `sidecar` value)                     | `[]`        |
| `service.annotations`              | Additional annotations for the etcd service                                        | `{}`        |
| `service.sessionAffinity`          | Session Affinity for Kubernetes service, can be "None" or "ClientIP"               | `None`      |
| `service.sessionAffinityConfig`    | Additional settings for the sessionAffinity                                        | `{}`        |


### Persistence parameters

| Name                       | Description                                                     | Value               |
| -------------------------- | --------------------------------------------------------------- | ------------------- |
| `persistence.enabled`      | If true, use a Persistent Volume Claim. If false, use emptyDir. | `true`              |
| `persistence.storageClass` | Persistent Volume Storage Class                                 | `""`                |
| `persistence.annotations`  | Annotations for the PVC                                         | `{}`                |
| `persistence.accessModes`  | Persistent Volume Access Modes                                  | `["ReadWriteOnce"]` |
| `persistence.size`         | PVC Storage Request for etcd data volume                        | `8Gi`               |
| `persistence.selector`     | Selector to match an existing Persistent Volume                 | `{}`                |


### Volume Permissions parameters

| Name                                   | Description                                                                                                                       | Value                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `volumePermissions.enabled`            | Enable init container that changes the owner and group of the persistent volume(s) mountpoint to `runAsUser:fsGroup`              | `false`                 |
| `volumePermissions.image.registry`     | Init container volume-permissions image registry                                                                                  | `docker.io`             |
| `volumePermissions.image.repository`   | Init container volume-permissions image name                                                                                      | `bitnami/bitnami-shell` |
| `volumePermissions.image.tag`          | Init container volume-permissions image tag                                                                                       | `11-debian-11-r63`      |
| `volumePermissions.image.digest`       | Init container volume-permissions image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag | `""`                    |
| `volumePermissions.image.pullPolicy`   | Init container volume-permissions image pull policy                                                                               | `IfNotPresent`          |
| `volumePermissions.image.pullSecrets`  | Specify docker-registry secret names as an array                                                                                  | `[]`                    |
| `volumePermissions.resources.limits`   | Init container volume-permissions resource  limits                                                                                | `{}`                    |
| `volumePermissions.resources.requests` | Init container volume-permissions resource  requests                                                                              | `{}`                    |


### Network Policy parameters

| Name                                    | Description                                                | Value   |
| --------------------------------------- | ---------------------------------------------------------- | ------- |
| `networkPolicy.enabled`                 | Enable creation of NetworkPolicy resources                 | `false` |
| `networkPolicy.allowExternal`           | Don't require client label for connections                 | `true`  |
| `networkPolicy.extraIngress`            | Add extra ingress rules to the NetworkPolicy               | `[]`    |
| `networkPolicy.extraEgress`             | Add extra ingress rules to the NetworkPolicy               | `[]`    |
| `networkPolicy.ingressNSMatchLabels`    | Labels to match to allow traffic from other namespaces     | `{}`    |
| `networkPolicy.ingressNSPodMatchLabels` | Pod labels to match to allow traffic from other namespaces | `{}`    |


### Metrics parameters

| Name                                      | Description                                                                                                                   | Value        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `metrics.enabled`                         | Expose etcd metrics                                                                                                           | `false`      |
| `metrics.podAnnotations`                  | Annotations for the Prometheus metrics on etcd pods                                                                           | `{}`         |
| `metrics.podMonitor.enabled`              | Create PodMonitor Resource for scraping metrics using PrometheusOperator                                                      | `false`      |
| `metrics.podMonitor.namespace`            | Namespace in which Prometheus is running                                                                                      | `monitoring` |
| `metrics.podMonitor.interval`             | Specify the interval at which metrics should be scraped                                                                       | `30s`        |
| `metrics.podMonitor.scrapeTimeout`        | Specify the timeout after which the scrape is ended                                                                           | `30s`        |
| `metrics.podMonitor.additionalLabels`     | Additional labels that can be used so PodMonitors will be discovered by Prometheus                                            | `{}`         |
| `metrics.podMonitor.scheme`               | Scheme to use for scraping                                                                                                    | `http`       |
| `metrics.podMonitor.tlsConfig`            | TLS configuration used for scrape endpoints used by Prometheus                                                                | `{}`         |
| `metrics.podMonitor.relabelings`          | Prometheus relabeling rules                                                                                                   | `[]`         |
| `metrics.prometheusRule.enabled`          | Create a Prometheus Operator PrometheusRule (also requires `metrics.enabled` to be `true` and `metrics.prometheusRule.rules`) | `false`      |
| `metrics.prometheusRule.namespace`        | Namespace for the PrometheusRule Resource (defaults to the Release Namespace)                                                 | `""`         |
| `metrics.prometheusRule.additionalLabels` | Additional labels that can be used so PrometheusRule will be discovered by Prometheus                                         | `{}`         |
| `metrics.prometheusRule.rules`            | Prometheus Rule definitions                                                                                                   | `[]`         |


### Snapshotting parameters

| Name                                            | Description                                                             | Value          |
| ----------------------------------------------- | ----------------------------------------------------------------------- | -------------- |
| `startFromSnapshot.enabled`                     | Initialize new cluster recovering an existing snapshot                  | `false`        |
| `startFromSnapshot.existingClaim`               | Existing PVC containing the etcd snapshot                               | `""`           |
| `startFromSnapshot.snapshotFilename`            | Snapshot filename                                                       | `""`           |
| `disasterRecovery.enabled`                      | Enable auto disaster recovery by periodically snapshotting the keyspace | `false`        |
| `disasterRecovery.cronjob.schedule`             | Schedule in Cron format to save snapshots                               | `*/30 * * * *` |
| `disasterRecovery.cronjob.historyLimit`         | Number of successful finished jobs to retain                            | `1`            |
| `disasterRecovery.cronjob.snapshotHistoryLimit` | Number of etcd snapshots to retain, tagged by date                      | `1`            |
| `disasterRecovery.cronjob.podAnnotations`       | Pod annotations for cronjob pods                                        | `{}`           |
| `disasterRecovery.cronjob.resources.limits`     | Cronjob container resource limits                                       | `{}`           |
| `disasterRecovery.cronjob.resources.requests`   | Cronjob container resource requests                                     | `{}`           |
| `disasterRecovery.cronjob.nodeSelector`         | Node labels for cronjob pods assignment                                 | `{}`           |
| `disasterRecovery.cronjob.tolerations`          | Tolerations for cronjob pods assignment                                 | `[]`           |
| `disasterRecovery.pvc.existingClaim`            | A manually managed Persistent Volume and Claim                          | `""`           |
| `disasterRecovery.pvc.size`                     | PVC Storage Request                                                     | `2Gi`          |
| `disasterRecovery.pvc.storageClassName`         | Storage Class for snapshots volume                                      | `nfs`          |


### Service account parameters

| Name                                          | Description                                                  | Value   |
| --------------------------------------------- | ------------------------------------------------------------ | ------- |
| `serviceAccount.create`                       | Enable/disable service account creation                      | `false` |
| `serviceAccount.name`                         | Name of the service account to create or use                 | `""`    |
| `serviceAccount.automountServiceAccountToken` | Enable/disable auto mounting of service account token        | `true`  |
| `serviceAccount.annotations`                  | Additional annotations to be included on the service account | `{}`    |
| `serviceAccount.labels`                       | Additional labels to be included on the service account      | `{}`    |


### Other parameters

| Name                 | Description                                                    | Value  |
| -------------------- | -------------------------------------------------------------- | ------ |
| `pdb.create`         | Enable/disable a Pod Disruption Budget creation                | `true` |
| `pdb.minAvailable`   | Minimum number/percentage of pods that should remain scheduled | `51%`  |
| `pdb.maxUnavailable` | Maximum number/percentage of pods that may be made unavailable | `""`   |


Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```console
$ helm install my-release \
  --set auth.rbac.rootPassword=secretpassword my-repo/etcd
```

The above command sets the etcd `root` account password to `secretpassword`.

> NOTE: Once this chart is deployed, it is not possible to change the application's access credentials, such as usernames or passwords, using Helm. To change these application credentials after deployment, delete any persistent volumes (PVs) used by the chart and re-deploy it, or use the application's built-in administrative tools if available.

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```console
$ helm install my-release -f values.yaml my-repo/etcd
```

> **Tip**: You can use the default [values.yaml](values.yaml)

## Configuration and installation details

### [Rolling VS Immutable tags](https://docs.bitnami.com/containers/how-to/understand-rolling-tags-containers/)

It is strongly recommended to use immutable tags in a production environment. This ensures your deployment does not change automatically if the same tag is updated with a different image.

Bitnami will release a new chart updating its containers if a new version of the main container, significant changes, or critical vulnerabilities exist.

### Cluster configuration

The Bitnami etcd chart can be used to bootstrap an etcd cluster, easy to scale and with available features to implement disaster recovery.

Refer to the [chart documentation](https://docs.bitnami.com/kubernetes/infrastructure/etcd/get-started/understand-default-configuration/) for more information about all these details.

### Enable security for etcd

The etcd chart can be configured with Role-based access control and TLS encryption to improve its security.

[Learn more about security in the chart documentation](https://docs.bitnami.com/kubernetes/infrastructure/etcd/administration/enable-security/).

### Persistence

The [Bitnami etcd](https://github.com/bitnami/containers/tree/main/bitnami/etcd) image stores the etcd data at the `/bitnami/etcd` path of the container. Persistent Volume Claims are used to keep the data across statefulsets.

The chart mounts a [Persistent Volume](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) volume at this location. The volume is created using dynamic volume provisioning by default. An existing PersistentVolumeClaim can also be defined for this purpose.

If you encounter errors when working with persistent volumes, refer to our [troubleshooting guide for persistent volumes](https://docs.bitnami.com/kubernetes/faq/troubleshooting/troubleshooting-persistence-volumes/).

### Backup and restore the etcd keyspace

The Bitnami etcd chart provides mechanisms to bootstrap the etcd cluster restoring an existing snapshot before initializing.

[Learn more about backup/restore features in the chart documentation](https://docs.bitnami.com/kubernetes/infrastructure/etcd/administration/backup-restore/).

### Exposing etcd metrics

The metrics exposed by etcd can be exposed to be scraped by Prometheus. This can be done by adding the required annotations for Prometheus to discover the metrics endpoints or creating a PodMonitor entry if you are using the Prometheus Operator.

[Learn more about exposing metrics in the chart documentation](https://docs.bitnami.com/kubernetes/infrastructure/etcd/administration/enable-metrics/).

### Using custom configuration

In order to use custom configuration parameters, two options are available:

- Using environment variables: etcd allows setting environment variables that map to configuration settings. In order to set extra environment variables, you can use the `extraEnvVars` property. Alternatively, you can use a ConfigMap or a Secret with the environment variables using the `extraEnvVarsCM` or the `extraEnvVarsSecret` properties.

```yaml
extraEnvVars:
  - name: ETCD_AUTO_COMPACTION_RETENTION
    value: "0"
  - name: ETCD_HEARTBEAT_INTERVAL
    value: "150"
```

- Using a custom `etcd.conf.yml`: The etcd chart allows mounting a custom `etcd.conf.yml` file as ConfigMap. In order to so, you can use the `configuration` property. Alternatively, you can use an existing ConfigMap using the `existingConfigmap` parameter.

### Auto Compaction

Since etcd keeps an exact history of its keyspace, this history should be periodically compacted to avoid performance degradation and eventual storage space exhaustion. Compacting the keyspace history drops all information about keys superseded prior to a given keyspace revision. The space used by these keys then becomes available for additional writes to the keyspace.

`autoCompactionMode`, by default periodic. Valid values: "periodic", "revision".
- 'periodic' for duration based retention, defaulting to hours if no time unit is provided (e.g. "5m").
- 'revision' for revision number based retention.
`autoCompactionRetention` for mvcc key value store in hour, by default 0, means disabled.

You can enable auto compaction by using following parameters:

```console
autoCompactionMode=periodic
autoCompactionRetention=10m
```

### Sidecars and Init Containers

If you have a need for additional containers to run within the same pod as the etcd app (e.g. an additional metrics or logging exporter), you can do so via the `sidecars` config parameter. Simply define your container according to the Kubernetes container spec.

```yaml
sidecars:
  - name: your-image-name
    image: your-image
    imagePullPolicy: Always
    ports:
      - name: portname
       containerPort: 1234
```

Similarly, you can add extra init containers using the `initContainers` parameter.

```yaml
initContainers:
  - name: your-image-name
    image: your-image
    imagePullPolicy: Always
    ports:
      - name: portname
        containerPort: 1234
```

### Deploying extra resources

There are cases where you may want to deploy extra objects, such a ConfigMap containing your app's configuration or some extra deployment with a micro service used by your app. For covering this case, the chart allows adding the full specification of other objects using the `extraDeploy` parameter.

### Setting Pod's affinity

This chart allows you to set your custom affinity using the `affinity` parameter. Find more information about Pod's affinity in the [kubernetes documentation](https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity).

As an alternative, you can use of the preset configurations for pod affinity, pod anti-affinity, and node affinity available at the [bitnami/common](https://github.com/bitnami/charts/tree/main/bitnami/common#affinities) chart. To do so, set the `podAffinityPreset`, `podAntiAffinityPreset`, or `nodeAffinityPreset` parameters.

## Troubleshooting

Find more information about how to deal with common errors related to Bitnami's Helm charts in [this troubleshooting guide](https://docs.bitnami.com/general/how-to/troubleshoot-helm-chart-issues).

## Upgrading

### To 8.0.0

This version reverts the change in the previous major bump ([7.0.0](https://github.com/bitnami/charts/tree/main/bitnami/etcd#to-700)). Now the default `etcd` branch is `3.5` again once confirmed by the [etcd developers](https://github.com/etcd-io/etcd/tree/main/CHANGELOG#production-recommendation) that this version is production-ready once solved the data corruption issue.

### To 7.0.0

This version changes the default `etcd` branch to `3.4` as suggested by [etcd developers](https://github.com/etcd-io/etcd/tree/main/CHANGELOG#production-recommendation). In order to migrate the data follow the official etcd instructions.

### To 6.0.0

This version introduces several features and performance improvements:

- The statefulset can now be scaled using `kubectl scale` command. Using `helm upgrade` to recalculate available endpoints is no longer needed.
- The scripts used for bootstrapping, runtime reconfiguration, and disaster recovery have been refactored and moved to the etcd container (see [this PR](https://github.com/bitnami/bitnami-docker-etcd/pull/13)) with two purposes: removing technical debt & improving the stability.
- Several parameters were reorganized to simplify the structure and follow the same standard used on other Bitnami charts:
  - `etcd.initialClusterState` is renamed to `initialClusterState`.
  - `statefulset.replicaCount` is renamed to `replicaCount`.
  - `statefulset.podManagementPolicy` is renamed to `podManagementPolicy`.
  - `statefulset.updateStrategy` and `statefulset.rollingUpdatePartition` are merged into `updateStrategy`.
  - `securityContext.*` is deprecated in favor of `podSecurityContext` and `containerSecurityContext`.
  - `configFileConfigMap` is deprecated in favor of `configuration` and `existingConfigmap`.
  - `envVarsConfigMap` is deprecated in favor of `extraEnvVars`, `extraEnvVarsCM` and `extraEnvVarsSecret`.
  - `allowNoneAuthentication` is renamed to `auth.rbac.allowNoneAuthentication`.
- New parameters/features were added:
  - `extraDeploy` to deploy any extra desired object.
  - `initContainers` and `sidecars` to define custom init containers and sidecars.
  - `extraVolumes` and `extraVolumeMounts` to define custom volumes and mount points.
  - Probes can be now customized, and support to startup probes is added.
  - LifecycleHooks can be customized using `lifecycleHooks` parameter.
  - The default command/args can be customized using `command` and `args` parameters.
- Metrics integration with Prometheus Operator does no longer use a ServiceMonitor object, but a PodMonitor instead.

Consequences:

- Backwards compatibility is not guaranteed unless you adapt you **values.yaml** according to the changes described above.

### To 5.2.0

This version introduces `bitnami/common`, a [library chart](https://helm.sh/docs/topics/library_charts/#helm) as a dependency. More documentation about this new utility could be found [here](https://github.com/bitnami/charts/tree/main/bitnami/common#bitnami-common-library-chart). Please, make sure that you have updated the chart dependencies before executing any upgrade.

### To 5.0.0

[On November 13, 2020, Helm v2 support formally ended](https://github.com/helm/charts#status-of-the-project). This major version is the result of the required changes applied to the Helm Chart to be able to incorporate the different features added in Helm v3 and to be consistent with the Helm project itself regarding the Helm v2 EOL.

[Learn more about this change and related upgrade considerations](https://docs.bitnami.com/kubernetes/infrastructure/etcd/administration/upgrade-helm3/).

### To 4.4.14

In this release we addressed a vulnerability that showed the `ETCD_ROOT_PASSWORD` environment variable in the application logs. Users are advised to update immediately. More information in [this issue](https://github.com/bitnami/charts/issues/1901).

### To 3.0.0

Backwards compatibility is not guaranteed. The following notables changes were included:

- **etcdctl** uses v3 API.
- Adds support for auto disaster recovery.
- Labels are adapted to follow the Helm charts best practices.

To upgrade from previous charts versions, create a snapshot of the keyspace and restore it in a new etcd cluster. Only v3 API data can be restored.
You can use the command below to upgrade your chart by starting a new cluster using an existing snapshot, available in an existing PVC, to initialize the members:

```console
$ helm install new-release my-repo/etcd \
  --set statefulset.replicaCount=3 \
  --set persistence.enabled=true \
  --set persistence.size=8Gi \
  --set startFromSnapshot.enabled=true \
  --set startFromSnapshot.existingClaim=my-claim \
  --set startFromSnapshot.snapshotFilename=my-snapshot.db
```

### To 1.0.0

Backwards compatibility is not guaranteed unless you modify the labels used on the chart's deployments.
Use the workaround below to upgrade from versions previous to 1.0.0. The following example assumes that the release name is etcd:

```console
$ kubectl delete statefulset etcd --cascade=false
```

## License

Copyright &copy; 2022 Bitnami

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
