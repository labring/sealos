# Grafana Helm Chart

* Installs the web dashboarding system [Grafana](http://grafana.org/)

## Get Repo Info

```console
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

_See [helm repo](https://helm.sh/docs/helm/helm_repo/) for command documentation._

## Installing the Chart

To install the chart with the release name `my-release`:

```console
helm install my-release grafana/grafana
```

## Uninstalling the Chart

To uninstall/delete the my-release deployment:

```console
helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Upgrading an existing Release to a new major version

A major chart version change (like v1.2.3 -> v2.0.0) indicates that there is an
incompatible breaking change needing manual actions.

### To 4.0.0 (And 3.12.1)

This version requires Helm >= 2.12.0.

### To 5.0.0

You have to add --force to your helm upgrade command as the labels of the chart have changed.

### To 6.0.0

This version requires Helm >= 3.1.0.

### To 7.0.0

For consistency with other Helm charts, the `global.image.registry` parameter was renamed
to `global.imageRegistry`. If you were not previously setting `global.image.registry`, no action
is required on upgrade. If you were previously setting `global.image.registry`, you will
need to instead set `global.imageRegistry`.

## Configuration

| Parameter                                 | Description                                   | Default                                                 |
|-------------------------------------------|-----------------------------------------------|---------------------------------------------------------|
| `replicas`                                | Number of nodes                               | `1`                                                     |
| `podDisruptionBudget.minAvailable`        | Pod disruption minimum available              | `nil`                                                   |
| `podDisruptionBudget.maxUnavailable`      | Pod disruption maximum unavailable            | `nil`                                                   |
| `podDisruptionBudget.apiVersion`          | Pod disruption apiVersion                     | `nil`                                                   |
| `deploymentStrategy`                      | Deployment strategy                           | `{ "type": "RollingUpdate" }`                           |
| `livenessProbe`                           | Liveness Probe settings                       | `{ "httpGet": { "path": "/api/health", "port": 3000 } "initialDelaySeconds": 60, "timeoutSeconds": 30, "failureThreshold": 10 }` |
| `readinessProbe`                          | Readiness Probe settings                      | `{ "httpGet": { "path": "/api/health", "port": 3000 } }`|
| `securityContext`                         | Deployment securityContext                    | `{"runAsUser": 472, "runAsGroup": 472, "fsGroup": 472}`  |
| `priorityClassName`                       | Name of Priority Class to assign pods         | `nil`                                                   |
| `image.registry`                          | Image registry                                | `docker.io`                                       |
| `image.repository`                        | Image repository                              | `grafana/grafana`                                       |
| `image.tag`                               | Overrides the Grafana image tag whose default is the chart appVersion (`Must be >= 5.0.0`) | ``                                                      |
| `image.sha`                               | Image sha (optional)                          | ``                                                      |
| `image.pullPolicy`                        | Image pull policy                             | `IfNotPresent`                                          |
| `image.pullSecrets`                       | Image pull secrets (can be templated)         | `[]`                                                    |
| `service.enabled`                         | Enable grafana service                        | `true`                                                  |
| `service.ipFamilies`                      | Kubernetes service IP families                | `[]`                                                    |
| `service.ipFamilyPolicy`                  | Kubernetes service IP family policy           | `""`                                                    |
| `service.sessionAffinity`                 | Kubernetes service session affinity config    | `""`                                                    |
| `service.type`                            | Kubernetes service type                       | `ClusterIP`                                             |
| `service.port`                            | Kubernetes port where service is exposed      | `80`                                                    |
| `service.portName`                        | Name of the port on the service               | `service`                                               |
| `service.appProtocol`                     | Adds the appProtocol field to the service     | ``                                                      |
| `service.targetPort`                      | Internal service is port                      | `3000`                                                  |
| `service.nodePort`                        | Kubernetes service nodePort                   | `nil`                                                   |
| `service.annotations`                     | Service annotations (can be templated)        | `{}`                                                    |
| `service.labels`                          | Custom labels                                 | `{}`                                                    |
| `service.clusterIP`                       | internal cluster service IP                   | `nil`                                                   |
| `service.loadBalancerIP`                  | IP address to assign to load balancer (if supported) | `nil`                                            |
| `service.loadBalancerSourceRanges`        | list of IP CIDRs allowed access to lb (if supported) | `[]`                                             |
| `service.externalIPs`                     | service external IP addresses                 | `[]`                                                    |
| `service.externalTrafficPolicy`           | change the default externalTrafficPolicy | `nil`                                            |
| `headlessService`                         | Create a headless service                     | `false`                                                 |
| `extraExposePorts`                        | Additional service ports for sidecar containers| `[]`                                                   |
| `hostAliases`                             | adds rules to the pod's /etc/hosts            | `[]`                                                    |
| `ingress.enabled`                         | Enables Ingress                               | `false`                                                 |
| `ingress.annotations`                     | Ingress annotations (values are templated)    | `{}`                                                    |
| `ingress.labels`                          | Custom labels                                 | `{}`                                                    |
| `ingress.path`                            | Ingress accepted path                         | `/`                                                     |
| `ingress.pathType`                        | Ingress type of path                          | `Prefix`                                                |
| `ingress.hosts`                           | Ingress accepted hostnames                    | `["chart-example.local"]`                                                    |
| `ingress.extraPaths`                      | Ingress extra paths to prepend to every host configuration. Useful when configuring [custom actions with AWS ALB Ingress Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.6/guide/ingress/annotations/#actions). Requires `ingress.hosts` to have one or more host entries. | `[]`                                                    |
| `ingress.tls`                             | Ingress TLS configuration                     | `[]`                                                    |
| `ingress.ingressClassName`                | Ingress Class Name. MAY be required for Kubernetes versions >= 1.18 | `""`                              |
| `resources`                               | CPU/Memory resource requests/limits           | `{}`                                                    |
| `nodeSelector`                            | Node labels for pod assignment                | `{}`                                                    |
| `tolerations`                             | Toleration labels for pod assignment          | `[]`                                                    |
| `affinity`                                | Affinity settings for pod assignment          | `{}`                                                    |
| `extraInitContainers`                     | Init containers to add to the grafana pod     | `{}`                                                    |
| `extraContainers`                         | Sidecar containers to add to the grafana pod  | `""`                                                    |
| `extraContainerVolumes`                   | Volumes that can be mounted in sidecar containers | `[]`                                                |
| `extraLabels`                             | Custom labels for all manifests               | `{}`                                                    |
| `schedulerName`                           | Name of the k8s scheduler (other than default) | `nil`                                                  |
| `persistence.enabled`                     | Use persistent volume to store data           | `false`                                                 |
| `persistence.type`                        | Type of persistence (`pvc` or `statefulset`)  | `pvc`                                                   |
| `persistence.size`                        | Size of persistent volume claim               | `10Gi`                                                  |
| `persistence.existingClaim`               | Use an existing PVC to persist data (can be templated) | `nil`                                          |
| `persistence.storageClassName`            | Type of persistent volume claim               | `nil`                                                   |
| `persistence.accessModes`                 | Persistence access modes                      | `[ReadWriteOnce]`                                       |
| `persistence.annotations`                 | PersistentVolumeClaim annotations             | `{}`                                                    |
| `persistence.finalizers`                  | PersistentVolumeClaim finalizers              | `[ "kubernetes.io/pvc-protection" ]`                    |
| `persistence.extraPvcLabels`              | Extra labels to apply to a PVC.               | `{}`                                                    |
| `persistence.subPath`                     | Mount a sub dir of the persistent volume (can be templated) | `nil`                                     |
| `persistence.inMemory.enabled`            | If persistence is not enabled, whether to mount the local storage in-memory to improve performance | `false`                                                   |
| `persistence.inMemory.sizeLimit`          | SizeLimit for the in-memory local storage     | `nil`                                                   |
| `persistence.disableWarning`              | Hide NOTES warning, useful when persisting to a database | `false`                                       |
| `initChownData.enabled`                   | If false, don't reset data ownership at startup | true                                                  |
| `initChownData.image.registry`            | init-chown-data container image registry      | `docker.io`                                               |
| `initChownData.image.repository`          | init-chown-data container image repository    | `busybox`                                               |
| `initChownData.image.tag`                 | init-chown-data container image tag           | `1.31.1`                                                |
| `initChownData.image.sha`                 | init-chown-data container image sha (optional)| `""`                                                    |
| `initChownData.image.pullPolicy`          | init-chown-data container image pull policy   | `IfNotPresent`                                          |
| `initChownData.resources`                 | init-chown-data pod resource requests & limits | `{}`                                                   |
| `initChownData.securityContext`           | init-chown-data pod securityContext           | `{"readOnlyRootFilesystem": false, "runAsNonRoot": false}`, "runAsUser": 0, "seccompProfile": {"type": "RuntimeDefault"}, "capabilities": {"add": ["CHOWN"], "drop": ["ALL"]}}` |
| `schedulerName`                           | Alternate scheduler name                      | `nil`                                                   |
| `env`                                     | Extra environment variables passed to pods    | `{}`                                                    |
| `envValueFrom`                            | Environment variables from alternate sources. See the API docs on [EnvVarSource](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.17/#envvarsource-v1-core) for format details. Can be templated | `{}` |
| `envFromSecret`                           | Name of a Kubernetes secret (must be manually created in the same namespace) containing values to be added to the environment. Can be templated | `""` |
| `envFromSecrets`                          | List of Kubernetes secrets (must be manually created in the same namespace) containing values to be added to the environment. Can be templated | `[]` |
| `envFromConfigMaps`                       | List of Kubernetes ConfigMaps (must be manually created in the same namespace) containing values to be added to the environment. Can be templated | `[]` |
| `envRenderSecret`                         | Sensible environment variables passed to pods and stored as secret. (passed through [tpl](https://helm.sh/docs/howto/charts_tips_and_tricks/#using-the-tpl-function))   | `{}`                               |
| `enableServiceLinks`                      | Inject Kubernetes services as environment variables. | `true`                                           |
| `extraSecretMounts`                       | Additional grafana server secret mounts       | `[]`                                                    |
| `extraVolumeMounts`                       | Additional grafana server volume mounts       | `[]`                                                    |
| `extraVolumes`                            | Additional Grafana server volumes             | `[]`                                                    |
| `automountServiceAccountToken`            | Mounted the service account token on the grafana pod. Mandatory, if sidecars are enabled  | `true`      |
| `createConfigmap`                         | Enable creating the grafana configmap         | `true`                                                  |
| `extraConfigmapMounts`                    | Additional grafana server configMap volume mounts (values are templated) | `[]`                         |
| `extraEmptyDirMounts`                     | Additional grafana server emptyDir volume mounts | `[]`                                                 |
| `plugins`                                 | Plugins to be loaded along with Grafana       | `[]`                                                    |
| `datasources`                             | Configure grafana datasources (passed through tpl) | `{}`                                               |
| `alerting`                                | Configure grafana alerting (passed through tpl) | `{}`                                                  |
| `notifiers`                               | Configure grafana notifiers                   | `{}`                                                    |
| `dashboardProviders`                      | Configure grafana dashboard providers         | `{}`                                                    |
| `defaultCurlOptions`                      | Configure default curl short options for all dashboards, the beginning dash is required  | `-skf`       |
| `dashboards`                              | Dashboards to import                          | `{}`                                                    |
| `dashboardsConfigMaps`                    | ConfigMaps reference that contains dashboards | `{}`                                                    |
| `grafana.ini`                             | Grafana's primary configuration               | `{}`                                                    |
| `global.imageRegistry`                    | Global image pull registry for all images.    | `null`                                   |
| `global.imagePullSecrets`                 | Global image pull secrets (can be templated). Allows either an array of {name: pullSecret} maps (k8s-style), or an array of strings (more common helm-style).  | `[]`                                                    |
| `ldap.enabled`                            | Enable LDAP authentication                    | `false`                                                 |
| `ldap.existingSecret`                     | The name of an existing secret containing the `ldap.toml` file, this must have the key `ldap-toml`. | `""` |
| `ldap.config`                             | Grafana's LDAP configuration                  | `""`                                                    |
| `annotations`                             | Deployment annotations                        | `{}`                                                    |
| `labels`                                  | Deployment labels                             | `{}`                                                    |
| `podAnnotations`                          | Pod annotations                               | `{}`                                                    |
| `podLabels`                               | Pod labels                                    | `{}`                                                    |
| `podPortName`                             | Name of the grafana port on the pod           | `grafana`                                               |
| `lifecycleHooks`                          | Lifecycle hooks for podStart and preStop [Example](https://kubernetes.io/docs/tasks/configure-pod-container/attach-handler-lifecycle-event/#define-poststart-and-prestop-handlers)     | `{}`                                                    |
| `sidecar.image.registry`                  | Sidecar image registry                        | `quay.io`                          |
| `sidecar.image.repository`                | Sidecar image repository                      | `kiwigrid/k8s-sidecar`                          |
| `sidecar.image.tag`                       | Sidecar image tag                             | `1.30.0`                                                |
| `sidecar.image.sha`                       | Sidecar image sha (optional)                  | `""`                                                    |
| `sidecar.imagePullPolicy`                 | Sidecar image pull policy                     | `IfNotPresent`                                          |
| `sidecar.resources`                       | Sidecar resources                             | `{}`                                                    |
| `sidecar.securityContext`                 | Sidecar securityContext                       | `{}`                                                    |
| `sidecar.enableUniqueFilenames`           | Sets the kiwigrid/k8s-sidecar UNIQUE_FILENAMES environment variable. If set to `true` the sidecar will create unique filenames where duplicate data keys exist between ConfigMaps and/or Secrets within the same or multiple Namespaces. | `false`                           |
| `sidecar.alerts.enabled`             | Enables the cluster wide search for alerts and adds/updates/deletes them in grafana |`false`       |
| `sidecar.alerts.label`               | Label that config maps with alerts should have to be added (can be templated) | `grafana_alert`                               |
| `sidecar.alerts.labelValue`          | Label value that config maps with alerts should have to be added (can be templated) | `""`                                |
| `sidecar.alerts.searchNamespace`     | Namespaces list. If specified, the sidecar will search for alerts config-maps  inside these namespaces. Otherwise the namespace in which the sidecar is running will be used. It's also possible to specify ALL to search in all namespaces. | `nil`                               |
| `sidecar.alerts.watchMethod`         | Method to use to detect ConfigMap changes. With WATCH the sidecar will do a WATCH requests, with SLEEP it will list all ConfigMaps, then sleep for 60 seconds. | `WATCH` |
| `sidecar.alerts.resource`            | Should the sidecar looks into secrets, configmaps or both. | `both`                               |
| `sidecar.alerts.reloadURL`           | Full url of datasource configuration reload API endpoint, to invoke after a config-map change | `"http://localhost:3000/api/admin/provisioning/alerting/reload"` |
| `sidecar.alerts.skipReload`          | Enabling this omits defining the REQ_URL and REQ_METHOD environment variables | `false` |
| `sidecar.alerts.initAlerts`          | Set to true to deploy the alerts sidecar as an initContainer. This is needed if skipReload is true, to load any alerts defined at startup time. | `false` |
| `sidecar.alerts.extraMounts`         | Additional alerts sidecar volume mounts. | `[]`                               |
| `sidecar.dashboards.enabled`              | Enables the cluster wide search for dashboards and adds/updates/deletes them in grafana | `false`       |
| `sidecar.dashboards.SCProvider`           | Enables creation of sidecar provider          | `true`                                                  |
| `sidecar.dashboards.provider.name`        | Unique name of the grafana provider           | `sidecarProvider`                                       |
| `sidecar.dashboards.provider.orgid`       | Id of the organisation, to which the dashboards should be added | `1`                                   |
| `sidecar.dashboards.provider.folder`      | Logical folder in which grafana groups dashboards | `""`                                                |
| `sidecar.dashboards.provider.folderUid`   | Allows you to specify the static UID for the logical folder above | `""`                                |
| `sidecar.dashboards.provider.disableDelete` | Activate to avoid the deletion of imported dashboards | `false`                                       |
| `sidecar.dashboards.provider.allowUiUpdates` | Allow updating provisioned dashboards from the UI | `false`                                          |
| `sidecar.dashboards.provider.type`        | Provider type                                 | `file`                                                  |
| `sidecar.dashboards.provider.foldersFromFilesStructure`        | Allow Grafana to replicate dashboard structure from filesystem.                                 | `false`                                                  |
| `sidecar.dashboards.watchMethod`          | Method to use to detect ConfigMap changes. With WATCH the sidecar will do a WATCH requests, with SLEEP it will list all ConfigMaps, then sleep for 60 seconds. | `WATCH` |
| `sidecar.skipTlsVerify`                   | Set to true to skip tls verification for kube api calls | `nil`                                         |
| `sidecar.dashboards.label`                | Label that config maps with dashboards should have to be added (can be templated) | `grafana_dashboard`                                |
| `sidecar.dashboards.labelValue`                | Label value that config maps with dashboards should have to be added (can be templated) | `""`                                |
| `sidecar.dashboards.folder`               | Folder in the pod that should hold the collected dashboards (unless `sidecar.dashboards.defaultFolderName` is set). This path will be mounted. | `/tmp/dashboards`    |
| `sidecar.dashboards.folderAnnotation`     | The annotation the sidecar will look for in configmaps to override the destination folder for files | `nil`                                                  |
| `sidecar.dashboards.defaultFolderName`    | The default folder name, it will create a subfolder under the `sidecar.dashboards.folder` and put dashboards in there instead | `nil`                                |
| `sidecar.dashboards.searchNamespace`      | Namespaces list. If specified, the sidecar will search for dashboards config-maps  inside these namespaces. Otherwise the namespace in which the sidecar is running will be used. It's also possible to specify ALL to search in all namespaces. | `nil`                                |
| `sidecar.dashboards.script`               | Absolute path to shell script to execute after a configmap got reloaded. | `nil`                                |
| `sidecar.dashboards.reloadURL`            | Full url of dashboards configuration reload API endpoint, to invoke after a config-map change | `"http://localhost:3000/api/admin/provisioning/dashboards/reload"` |
| `sidecar.dashboards.skipReload`           | Enabling this omits defining the REQ_USERNAME, REQ_PASSWORD, REQ_URL and REQ_METHOD environment variables | `false` |
| `sidecar.dashboards.resource`             | Should the sidecar looks into secrets, configmaps or both. | `both`                               |
| `sidecar.dashboards.extraMounts`          | Additional dashboard sidecar volume mounts. | `[]`                               |
| `sidecar.datasources.enabled`             | Enables the cluster wide search for datasources and adds/updates/deletes them in grafana |`false`       |
| `sidecar.datasources.label`               | Label that config maps with datasources should have to be added (can be templated) | `grafana_datasource`                               |
| `sidecar.datasources.labelValue`          | Label value that config maps with datasources should have to be added (can be templated) | `""`                                |
| `sidecar.datasources.searchNamespace`     | Namespaces list. If specified, the sidecar will search for datasources config-maps  inside these namespaces. Otherwise the namespace in which the sidecar is running will be used. It's also possible to specify ALL to search in all namespaces. | `nil`                               |
| `sidecar.datasources.watchMethod`         | Method to use to detect ConfigMap changes. With WATCH the sidecar will do a WATCH requests, with SLEEP it will list all ConfigMaps, then sleep for 60 seconds. | `WATCH` |
| `sidecar.datasources.resource`            | Should the sidecar looks into secrets, configmaps or both. | `both`                               |
| `sidecar.datasources.reloadURL`           | Full url of datasource configuration reload API endpoint, to invoke after a config-map change | `"http://localhost:3000/api/admin/provisioning/datasources/reload"` |
| `sidecar.datasources.skipReload`          | Enabling this omits defining the REQ_URL and REQ_METHOD environment variables | `false` |
| `sidecar.datasources.initDatasources`     | Set to true to deploy the datasource sidecar as an initContainer in addition to a container. This is needed if skipReload is true, to load any datasources defined at startup time. | `false` |
| `sidecar.notifiers.enabled`               | Enables the cluster wide search for notifiers and adds/updates/deletes them in grafana | `false`        |
| `sidecar.notifiers.label`                 | Label that config maps with notifiers should have to be added (can be templated) | `grafana_notifier`                               |
| `sidecar.notifiers.labelValue`            | Label value that config maps with notifiers should have to be added (can be templated) | `""`                                |
| `sidecar.notifiers.searchNamespace`       | Namespaces list. If specified, the sidecar will search for notifiers config-maps (or secrets) inside these namespaces. Otherwise the namespace in which the sidecar is running will be used. It's also possible to specify ALL to search in all namespaces. | `nil`                               |
| `sidecar.notifiers.watchMethod`           | Method to use to detect ConfigMap changes. With WATCH the sidecar will do a WATCH requests, with SLEEP it will list all ConfigMaps, then sleep for 60 seconds. | `WATCH` |
| `sidecar.notifiers.resource`              | Should the sidecar looks into secrets, configmaps or both. | `both`                               |
| `sidecar.notifiers.reloadURL`             | Full url of notifier configuration reload API endpoint, to invoke after a config-map change | `"http://localhost:3000/api/admin/provisioning/notifications/reload"` |
| `sidecar.notifiers.skipReload`            | Enabling this omits defining the REQ_URL and REQ_METHOD environment variables | `false` |
| `sidecar.notifiers.initNotifiers`         | Set to true to deploy the notifier sidecar as an initContainer in addition to a container. This is needed if skipReload is true, to load any notifiers defined at startup time. | `false` |
| `smtp.existingSecret`                     | The name of an existing secret containing the SMTP credentials. | `""`                                  |
| `smtp.userKey`                            | The key in the existing SMTP secret containing the username. | `"user"`                                 |
| `smtp.passwordKey`                        | The key in the existing SMTP secret containing the password. | `"password"`                             |
| `admin.existingSecret`                    | The name of an existing secret containing the admin credentials (can be templated). | `""`                                 |
| `admin.userKey`                           | The key in the existing admin secret containing the username. | `"admin-user"`                          |
| `admin.passwordKey`                       | The key in the existing admin secret containing the password. | `"admin-password"`                      |
| `serviceAccount.automountServiceAccountToken` | Automount the service account token on all pods where is service account is used | `false` |
| `serviceAccount.annotations`              | ServiceAccount annotations                    |                                                         |
| `serviceAccount.create`                   | Create service account                        | `true`                                                  |
| `serviceAccount.labels`                   | ServiceAccount labels                         | `{}`                                                    |
| `serviceAccount.name`                     | Service account name to use, when empty will be set to created account if `serviceAccount.create` is set else to `default` | `` |
| `serviceAccount.nameTest`                 | Service account name to use for test, when empty will be set to created account if `serviceAccount.create` is set else to `default` | `nil` |
| `rbac.create`                             | Create and use RBAC resources                 | `true`                                                  |
| `rbac.namespaced`                         | Creates Role and Rolebinding instead of the default ClusterRole and ClusteRoleBindings for the grafana instance  | `false` |
| `rbac.useExistingRole`                    | Set to a rolename to use existing role - skipping role creating - but still doing serviceaccount and rolebinding to the rolename set here. | `nil` |
| `rbac.pspEnabled`                         | Create PodSecurityPolicy (with `rbac.create`, grant roles permissions as well) | `false`                |
| `rbac.pspUseAppArmor`                     | Enforce AppArmor in created PodSecurityPolicy (requires `rbac.pspEnabled`)  | `false`                   |
| `rbac.extraRoleRules`                     | Additional rules to add to the Role           | []                                                      |
| `rbac.extraClusterRoleRules`              | Additional rules to add to the ClusterRole    | []                                                      |
| `command`                                 | Define command to be executed by grafana container at startup | `nil`                                   |
| `args`                                    | Define additional args if command is used     | `nil`                                                   |
| `testFramework.enabled`                   | Whether to create test-related resources      | `true`                                                  |
| `testFramework.image.registry`            | `test-framework` image registry.            | `docker.io`                                             |
| `testFramework.image.repository`          | `test-framework` image repository.            | `bats/bats`                                             |
| `testFramework.image.tag`                 | `test-framework` image tag.                   | `v1.4.1`                                                |
| `testFramework.imagePullPolicy`           | `test-framework` image pull policy.           | `IfNotPresent`                                          |
| `testFramework.securityContext`           | `test-framework` securityContext              | `{}`                                                    |
| `downloadDashboards.env`                  | Environment variables to be passed to the `download-dashboards` container | `{}`                        |
| `downloadDashboards.envFromSecret`        | Name of a Kubernetes secret (must be manually created in the same namespace) containing values to be added to the environment. Can be templated | `""` |
| `downloadDashboards.resources`            | Resources of `download-dashboards` container  | `{}`                                                    |
| `downloadDashboardsImage.registry`        | Curl docker image registry                    | `docker.io`                                       |
| `downloadDashboardsImage.repository`      | Curl docker image repository                  | `curlimages/curl`                                       |
| `downloadDashboardsImage.tag`             | Curl docker image tag                         | `8.9.1`                                                 |
| `downloadDashboardsImage.sha`             | Curl docker image sha (optional)              | `""`                                                    |
| `downloadDashboardsImage.pullPolicy`      | Curl docker image pull policy                 | `IfNotPresent`                                          |
| `namespaceOverride`                       | Override the deployment namespace             | `""` (`Release.Namespace`)                              |
| `serviceMonitor.enabled`                  | Use servicemonitor from prometheus operator   | `false`                                                 |
| `serviceMonitor.namespace`                | Namespace this servicemonitor is installed in |                                                         |
| `serviceMonitor.interval`                 | How frequently Prometheus should scrape       | `1m`                                                    |
| `serviceMonitor.path`                     | Path to scrape                                | `/metrics`                                              |
| `serviceMonitor.scheme`                   | Scheme to use for metrics scraping            | `http`                                                  |
| `serviceMonitor.tlsConfig`                | TLS configuration block for the endpoint      | `{}`                                                    |
| `serviceMonitor.labels`                   | Labels for the servicemonitor passed to Prometheus Operator      |  `{}`                                |
| `serviceMonitor.scrapeTimeout`            | Timeout after which the scrape is ended       | `30s`                                                   |
| `serviceMonitor.relabelings`              | RelabelConfigs to apply to samples before scraping.     | `[]`                                      |
| `serviceMonitor.metricRelabelings`        | MetricRelabelConfigs to apply to samples before ingestion.  | `[]`                                      |
| `revisionHistoryLimit`                    | Number of old ReplicaSets to retain           | `10`                                                    |
| `imageRenderer.enabled`                    | Enable the image-renderer deployment & service                                     | `false`                          |
| `imageRenderer.image.registry`             | image-renderer Image registry                                                      | `docker.io` |
| `imageRenderer.image.repository`           | image-renderer Image repository                                                    | `grafana/grafana-image-renderer` |
| `imageRenderer.image.tag`                  | image-renderer Image tag                                                           | `latest`                         |
| `imageRenderer.image.sha`                  | image-renderer Image sha (optional)                                                | `""`                             |
| `imageRenderer.image.pullSecrets`                  |  image-renderer Image pull secrets (optional)                              | `[]`                             |
| `imageRenderer.image.pullPolicy`           | image-renderer ImagePullPolicy                                                     | `Always`                         |
| `imageRenderer.env`                        | extra env-vars for image-renderer                                                  | `{}`                             |
| `imageRenderer.envValueFrom`               | Environment variables for image-renderer from alternate sources. See the API docs on [EnvVarSource](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.17/#envvarsource-v1-core) for format details. Can be templated | `{}` |
| `imageRenderer.extraConfigmapMounts`       | Additional image-renderer configMap volume mounts (values are templated)           | `[]`                             |
| `imageRenderer.extraSecretMounts`          | Additional image-renderer secret volume mounts                                     | `[]`                             |
| `imageRenderer.extraVolumeMounts`          | Additional image-renderer volume mounts                                            | `[]`                             |
| `imageRenderer.extraVolumes`               | Additional image-renderer volumes                                                  | `[]`                             |
| `imageRenderer.serviceAccountName`         | image-renderer deployment serviceAccountName                                       | `""`                             |
| `imageRenderer.securityContext`            | image-renderer deployment securityContext                                          | `{}`                             |
| `imageRenderer.podAnnotations`            | image-renderer image-renderer pod annotation                                       | `{}`                             |
| `imageRenderer.hostAliases`                | image-renderer deployment Host Aliases                                             | `[]`                             |
| `imageRenderer.priorityClassName`          | image-renderer deployment priority class                                           | `''`                             |
| `imageRenderer.service.enabled`            | Enable the image-renderer service                                                  | `true`                           |
| `imageRenderer.service.portName`           | image-renderer service port name                                                   | `http`                           |
| `imageRenderer.service.port`               | image-renderer port used by deployment                                             | `8081`                           |
| `imageRenderer.service.targetPort`         | image-renderer service port used by service                                        | `8081`                           |
| `imageRenderer.appProtocol`                | Adds the appProtocol field to the service                                          | ``                               |
| `imageRenderer.grafanaSubPath`             | Grafana sub path to use for image renderer callback url                            | `''`                             |
| `imageRenderer.serverURL`                  | Remote image renderer url                                                          | `''`                             |
| `imageRenderer.renderingCallbackURL`       | Callback url for the Grafana image renderer                                        | `''`                             |
| `imageRenderer.podPortName`                | name of the image-renderer port on the pod                                         | `http`                           |
| `imageRenderer.revisionHistoryLimit`       | number of image-renderer replica sets to keep                                      | `10`                             |
| `imageRenderer.networkPolicy.limitIngress` | Enable a NetworkPolicy to limit inbound traffic from only the created grafana pods | `true`                           |
| `imageRenderer.networkPolicy.limitEgress`  | Enable a NetworkPolicy to limit outbound traffic to only the created grafana pods  | `false`                          |
| `imageRenderer.resources`                  | Set resource limits for image-renderer pods                                        | `{}`                             |
| `imageRenderer.nodeSelector`               | Node labels for pod assignment                | `{}`                                                    |
| `imageRenderer.tolerations`                | Toleration labels for pod assignment          | `[]`                                                    |
| `imageRenderer.affinity`                   | Affinity settings for pod assignment          | `{}`                                                    |
| `networkPolicy.enabled`                    | Enable creation of NetworkPolicy resources.                                                                              | `false`             |
| `networkPolicy.allowExternal`              | Don't require client label for connections                                                                               | `true`              |
| `networkPolicy.explicitNamespacesSelector` | A Kubernetes LabelSelector to explicitly select namespaces from which traffic could be allowed                           | `{}`                |
| `networkPolicy.ingress`                    | Enable the creation of an ingress network policy             | `true`    |
| `networkPolicy.egress.enabled`             | Enable the creation of an egress network policy              | `false`   |
| `networkPolicy.egress.ports`               | An array of ports to allow for the egress                    | `[]`    |
| `enableKubeBackwardCompatibility`          | Enable backward compatibility of kubernetes where pod's defintion version below 1.13 doesn't have the enableServiceLinks option  | `false`     |

### Example ingress with path

With grafana 6.3 and above

```yaml
grafana.ini:
  server:
    domain: monitoring.example.com
    root_url: "%(protocol)s://%(domain)s/grafana"
    serve_from_sub_path: true
ingress:
  enabled: true
  hosts:
    - "monitoring.example.com"
  path: "/grafana"
```

### Example of extraVolumeMounts and extraVolumes

Configure additional volumes with `extraVolumes` and volume mounts with `extraVolumeMounts`.

Example for `extraVolumeMounts` and corresponding `extraVolumes`:

```yaml
extraVolumeMounts:
  - name: plugins
    mountPath: /var/lib/grafana/plugins
    subPath: configs/grafana/plugins
    readOnly: false
  - name: dashboards
    mountPath: /var/lib/grafana/dashboards
    hostPath: /usr/shared/grafana/dashboards
    readOnly: false

extraVolumes:
  - name: plugins
    existingClaim: existing-grafana-claim
  - name: dashboards
    hostPath: /usr/shared/grafana/dashboards
```

Volumes default to `emptyDir`. Set to `persistentVolumeClaim`,
`hostPath`, `csi`, or `configMap` for other types. For a
`persistentVolumeClaim`, specify an existing claim name with
`existingClaim`.

## Import dashboards

There are a few methods to import dashboards to Grafana. Below are some examples and explanations as to how to use each method:

```yaml
dashboards:
  default:
    some-dashboard:
      json: |
        {
          "annotations":

          ...
          # Complete json file here
          ...

          "title": "Some Dashboard",
          "uid": "abcd1234",
          "version": 1
        }
    custom-dashboard:
      # This is a path to a file inside the dashboards directory inside the chart directory
      file: dashboards/custom-dashboard.json
    prometheus-stats:
      # Ref: https://grafana.com/dashboards/2
      gnetId: 2
      revision: 2
      datasource: Prometheus
    loki-dashboard-quick-search:
      gnetId: 12019
      revision: 2
      datasource:
      - name: DS_PROMETHEUS
        value: Prometheus
      - name: DS_LOKI
        value: Loki
    local-dashboard:
      url: https://github.com/cloudnative-pg/grafana-dashboards/blob/main/charts/cluster/grafana-dashboard.json
      # redirects to:
      # https://raw.githubusercontent.com/cloudnative-pg/grafana-dashboards/refs/heads/main/charts/cluster/grafana-dashboard.json

      # default: -skf
      # -s  - silent mode
      # -k  - allow insecure (eg: non-TLS) connections
      # -f  - fail fast
      # -L  - follow HTTP redirects
      curlOptions: -Lf
```

## BASE64 dashboards

Dashboards could be stored on a server that does not return JSON directly and instead of it returns a Base64 encoded file (e.g. Gerrit)
A new parameter has been added to the url use case so if you specify a b64content value equals to true after the url entry a Base64 decoding is applied before save the file to disk.
If this entry is not set or is equals to false not decoding is applied to the file before saving it to disk.

### Gerrit use case

Gerrit API for download files has the following schema: <https://yourgerritserver/a/{project-name}/branches/{branch-id}/files/{file-id}/content> where {project-name} and
{file-id} usually has '/' in their values and so they MUST be replaced by %2F so if project-name is user/repo, branch-id is master and file-id is equals to dir1/dir2/dashboard
the url value is <https://yourgerritserver/a/user%2Frepo/branches/master/files/dir1%2Fdir2%2Fdashboard/content>

## Sidecar for dashboards

If the parameter `sidecar.dashboards.enabled` is set, a sidecar container is deployed in the grafana
pod. This container watches all configmaps (or secrets) in the cluster and filters out the ones with
a label as defined in `sidecar.dashboards.label`. The files defined in those configmaps are written
to a folder and accessed by grafana. Changes to the configmaps are monitored and the imported
dashboards are deleted/updated.

A recommendation is to use one configmap per dashboard, as a reduction of multiple dashboards inside
one configmap is currently not properly mirrored in grafana.

Example dashboard config:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sample-grafana-dashboard
  labels:
    grafana_dashboard: "1"
data:
  k8s-dashboard.json: |-
  [...]
```

## Sidecar for datasources

If the parameter `sidecar.datasources.enabled` is set, an init container is deployed in the grafana
pod. This container lists all secrets (or configmaps, though not recommended) in the cluster and
filters out the ones with a label as defined in `sidecar.datasources.label`. The files defined in
those secrets are written to a folder and accessed by grafana on startup. Using these yaml files,
the data sources in grafana can be imported.

Should you aim for reloading datasources in Grafana each time the config is changed, set `sidecar.datasources.skipReload: false` and adjust `sidecar.datasources.reloadURL` to `http://<svc-name>.<namespace>.svc.cluster.local/api/admin/provisioning/datasources/reload`.

Secrets are recommended over configmaps for this usecase because datasources usually contain private
data like usernames and passwords. Secrets are the more appropriate cluster resource to manage those.

Example values to add a postgres datasource as a kubernetes secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-datasources
  labels:
    grafana_datasource: 'true' # default value for: sidecar.datasources.label
stringData:
  pg-db.yaml: |-
    apiVersion: 1
    datasources:
      - name: My pg db datasource
        type: postgres
        url: my-postgresql-db:5432
        user: db-readonly-user
        secureJsonData:
          password: 'SUperSEcretPa$$word'
        jsonData:
          database: my_datase
          sslmode: 'disable' # disable/require/verify-ca/verify-full
          maxOpenConns: 0 # Grafana v5.4+
          maxIdleConns: 2 # Grafana v5.4+
          connMaxLifetime: 14400 # Grafana v5.4+
          postgresVersion: 1000 # 903=9.3, 904=9.4, 905=9.5, 906=9.6, 1000=10
          timescaledb: false
        # <bool> allow users to edit datasources from the UI.
        editable: false
```

Example values to add a datasource adapted from [Grafana](http://docs.grafana.org/administration/provisioning/#example-datasource-config-file):

```yaml
datasources:
 datasources.yaml:
   apiVersion: 1
   datasources:
      # <string, required> name of the datasource. Required
    - name: Graphite
      # <string, required> datasource type. Required
      type: graphite
      # <string, required> access mode. proxy or direct (Server or Browser in the UI). Required
      access: proxy
      # <int> org id. will default to orgId 1 if not specified
      orgId: 1
      # <string> url
      url: http://localhost:8080
      # <string> database password, if used
      password:
      # <string> database user, if used
      user:
      # <string> database name, if used
      database:
      # <bool> enable/disable basic auth
      basicAuth:
      # <string> basic auth username
      basicAuthUser:
      # <string> basic auth password
      basicAuthPassword:
      # <bool> enable/disable with credentials headers
      withCredentials:
      # <bool> mark as default datasource. Max one per org
      isDefault:
      # <map> fields that will be converted to json and stored in json_data
      jsonData:
         graphiteVersion: "1.1"
         tlsAuth: true
         tlsAuthWithCACert: true
      # <string> json object of data that will be encrypted.
      secureJsonData:
        tlsCACert: "..."
        tlsClientCert: "..."
        tlsClientKey: "..."
      version: 1
      # <bool> allow users to edit datasources from the UI.
      editable: false
```

## Sidecar for notifiers

If the parameter `sidecar.notifiers.enabled` is set, an init container is deployed in the grafana
pod. This container lists all secrets (or configmaps, though not recommended) in the cluster and
filters out the ones with a label as defined in `sidecar.notifiers.label`. The files defined in
those secrets are written to a folder and accessed by grafana on startup. Using these yaml files,
the notification channels in grafana can be imported. The secrets must be created before
`helm install` so that the notifiers init container can list the secrets.

Secrets are recommended over configmaps for this usecase because alert notification channels usually contain
private data like SMTP usernames and passwords. Secrets are the more appropriate cluster resource to manage those.

Example datasource config adapted from [Grafana](https://grafana.com/docs/grafana/latest/administration/provisioning/#alert-notification-channels):

```yaml
notifiers:
  - name: notification-channel-1
    type: slack
    uid: notifier1
    # either
    org_id: 2
    # or
    org_name: Main Org.
    is_default: true
    send_reminder: true
    frequency: 1h
    disable_resolve_message: false
    # See `Supported Settings` section for settings supporter for each
    # alert notification type.
    settings:
      recipient: 'XXX'
      token: 'xoxb'
      uploadImage: true
      url: https://slack.com

delete_notifiers:
  - name: notification-channel-1
    uid: notifier1
    org_id: 2
  - name: notification-channel-2
    # default org_id: 1
```

## Sidecar for alerting resources

If the parameter `sidecar.alerts.enabled` is set, a sidecar container is deployed in the grafana
pod. This container watches all configmaps (or secrets) in the cluster (namespace defined by `sidecar.alerts.searchNamespace`) and filters out the ones with
a label as defined in `sidecar.alerts.label` (default is `grafana_alert`). The files defined in those configmaps are written
to a folder and accessed by grafana. Changes to the configmaps are monitored and the imported alerting resources are updated, however, deletions are a little more complicated (see below).

This sidecar can be used to provision alert rules, contact points, notification policies, notification templates and mute timings as shown in [Grafana Documentation](https://grafana.com/docs/grafana/next/alerting/set-up/provision-alerting-resources/file-provisioning/).

To fetch the alert config which will be provisioned, use the alert provisioning API ([Grafana Documentation](https://grafana.com/docs/grafana/next/developers/http_api/alerting_provisioning/)).
You can use either JSON or YAML format.

Example config for an alert rule:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sample-grafana-alert
  labels:
    grafana_alert: "1"
data:
  k8s-alert.yml: |-
    apiVersion: 1
    groups:
        - orgId: 1
          name: k8s-alert
          [...]
```

To delete provisioned alert rules is a two step process, you need to delete the configmap which defined the alert rule
and then create a configuration which deletes the alert rule.

Example deletion configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: delete-sample-grafana-alert
  namespace: monitoring
  labels:
    grafana_alert: "1"
data:
  delete-k8s-alert.yml: |-
    apiVersion: 1
    deleteRules:
      - orgId: 1
        uid: 16624780-6564-45dc-825c-8bded4ad92d3
```

## Statically provision alerting resources

If you don't need to change alerting resources (alert rules, contact points, notification policies and notification templates) regularly you could use the `alerting` config option instead of the sidecar option above.
This will grab the alerting config and apply it statically at build time for the helm file.

There are two methods to statically provision alerting configuration in Grafana. Below are some examples and explanations as to how to use each method:

```yaml
alerting:
  team1-alert-rules.yaml:
    file: alerting/team1/rules.yaml
  team2-alert-rules.yaml:
    file: alerting/team2/rules.yaml
  team3-alert-rules.yaml:
    file: alerting/team3/rules.yaml
  notification-policies.yaml:
    file: alerting/shared/notification-policies.yaml
  notification-templates.yaml:
    file: alerting/shared/notification-templates.yaml
  contactpoints.yaml:
    apiVersion: 1
    contactPoints:
      - orgId: 1
        name: Slack channel
        receivers:
          - uid: default-receiver
            type: slack
            settings:
              # Webhook URL to be filled in
              url: ""
              # We need to escape double curly braces for the tpl function.
              text: '{{ `{{ template "default.message" . }}` }}'
              title: '{{ `{{ template "default.title" . }}` }}'
```

The two possibilities for static alerting resource provisioning are:

* Inlining the file contents as shown for contact points in the above example.
* Importing a file using a relative path starting from the chart root directory as shown for the alert rules in the above example.

### Important notes on file provisioning

* The format of the files is defined in the [Grafana documentation](https://grafana.com/docs/grafana/next/alerting/set-up/provision-alerting-resources/file-provisioning/) on file provisioning.
* The chart supports importing YAML and JSON files.
* The filename must be unique, otherwise one volume mount will overwrite the other.
* In case of inlining, double curly braces that arise from the Grafana configuration format and are not intended as templates for the chart must be escaped.
* The number of total files under `alerting:` is not limited. Each file will end up as a volume mount in the corresponding provisioning folder of the deployed Grafana instance.
* The file size for each import is limited by what the function `.Files.Get` can handle, which suffices for most cases.

## How to serve Grafana with a path prefix (/grafana)

In order to serve Grafana with a prefix (e.g., <http://example.com/grafana>), add the following to your values.yaml.

```yaml
ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/rewrite-target: /$1
    nginx.ingress.kubernetes.io/use-regex: "true"

  path: /grafana/?(.*)
  hosts:
    - k8s.example.dev

grafana.ini:
  server:
    root_url: http://localhost:3000/grafana # this host can be localhost
```

## How to securely reference secrets in grafana.ini

This example uses Grafana [file providers](https://grafana.com/docs/grafana/latest/administration/configuration/#file-provider) for secret values and the `extraSecretMounts` configuration flag (Additional grafana server secret mounts) to mount the secrets.

In grafana.ini:

```yaml
grafana.ini:
  [auth.generic_oauth]
  enabled = true
  client_id = $__file{/etc/secrets/auth_generic_oauth/client_id}
  client_secret = $__file{/etc/secrets/auth_generic_oauth/client_secret}
```

Existing secret, or created along with helm:

```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: auth-generic-oauth-secret
type: Opaque
stringData:
  client_id: <value>
  client_secret: <value>
```

Include in the `extraSecretMounts` configuration flag:

```yaml
extraSecretMounts:
  - name: auth-generic-oauth-secret-mount
    secretName: auth-generic-oauth-secret
    defaultMode: 0440
    mountPath: /etc/secrets/auth_generic_oauth
    readOnly: true
```

### extraSecretMounts using a Container Storage Interface (CSI) provider

This example uses a CSI driver e.g. retrieving secrets using [Azure Key Vault Provider](https://github.com/Azure/secrets-store-csi-driver-provider-azure)

```yaml
extraSecretMounts:
  - name: secrets-store-inline
    mountPath: /run/secrets
    readOnly: true
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: "my-provider"
      nodePublishSecretRef:
        name: akv-creds
```

## Image Renderer Plug-In

This chart supports enabling [remote image rendering](https://github.com/grafana/grafana-image-renderer/blob/master/README.md#run-in-docker)

```yaml
imageRenderer:
  enabled: true
```

### Image Renderer NetworkPolicy

By default the image-renderer pods will have a network policy which only allows ingress traffic from the created grafana instance

### High Availability for unified alerting

If you want to run Grafana in a high availability cluster you need to enable
the headless service by setting `headlessService: true` in your `values.yaml`
file.

As next step you have to setup the `grafana.ini` in your `values.yaml` in a way
that it will make use of the headless service to obtain all the IPs of the
cluster. You should replace ``{{ Name }}`` with the name of your helm deployment.

```yaml
grafana.ini:
  ...
  unified_alerting:
    enabled: true
    ha_peers: {{ Name }}-headless:9094
    ha_listen_address: ${POD_IP}:9094
    ha_advertise_address: ${POD_IP}:9094
    rule_version_record_limit: "5"

  alerting:
    enabled: false
```
