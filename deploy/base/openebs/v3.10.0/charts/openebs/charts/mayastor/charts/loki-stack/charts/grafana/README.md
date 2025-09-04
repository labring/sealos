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

## Configuration

| Parameter                                 | Description                                   | Default                                                 |
|-------------------------------------------|-----------------------------------------------|---------------------------------------------------------|
| `replicas`                                | Number of nodes                               | `1`                                                     |
| `podDisruptionBudget.minAvailable`        | Pod disruption minimum available              | `nil`                                                   |
| `podDisruptionBudget.maxUnavailable`      | Pod disruption maximum unavailable            | `nil`                                                   |
| `deploymentStrategy`                      | Deployment strategy                           | `{ "type": "RollingUpdate" }`                           |
| `livenessProbe`                           | Liveness Probe settings                       | `{ "httpGet": { "path": "/api/health", "port": 3000 } "initialDelaySeconds": 60, "timeoutSeconds": 30, "failureThreshold": 10 }` |
| `readinessProbe`                          | Readiness Probe settings                      | `{ "httpGet": { "path": "/api/health", "port": 3000 } }`|
| `securityContext`                         | Deployment securityContext                    | `{"runAsUser": 472, "runAsGroup": 472, "fsGroup": 472}`  |
| `priorityClassName`                       | Name of Priority Class to assign pods         | `nil`                                                   |
| `image.repository`                        | Image repository                              | `grafana/grafana`                                       |
| `image.tag`                               | Image tag (`Must be >= 5.0.0`)                | `8.2.5`                                                 |
| `image.sha`                               | Image sha (optional)                          | `2acf04c016c77ca2e89af3536367ce847ee326effb933121881c7c89781051d3` |
| `image.pullPolicy`                        | Image pull policy                             | `IfNotPresent`                                          |
| `image.pullSecrets`                       | Image pull secrets                            | `{}`                                                    |
| `service.enabled`                         | Enable grafana service                        | `true`                                                  |
| `service.type`                            | Kubernetes service type                       | `ClusterIP`                                             |
| `service.port`                            | Kubernetes port where service is exposed      | `80`                                                    |
| `service.portName`                        | Name of the port on the service               | `service`                                               |
| `service.targetPort`                      | Internal service is port                      | `3000`                                                  |
| `service.nodePort`                        | Kubernetes service nodePort                   | `nil`                                                   |
| `service.annotations`                     | Service annotations                           | `{}`                                                    |
| `service.labels`                          | Custom labels                                 | `{}`                                                    |
| `service.clusterIP`                       | internal cluster service IP                   | `nil`                                                   |
| `service.loadBalancerIP`                  | IP address to assign to load balancer (if supported) | `nil`                                            |
| `service.loadBalancerSourceRanges`        | list of IP CIDRs allowed access to lb (if supported) | `[]`                                             |
| `service.externalIPs`                     | service external IP addresses                 | `[]`                                                    |
| `headlessService`                         | Create a headless service                     | `false`                                                 |
| `extraExposePorts`                        | Additional service ports for sidecar containers| `[]`                                                   |
| `hostAliases`                             | adds rules to the pod's /etc/hosts            | `[]`                                                    |
| `ingress.enabled`                         | Enables Ingress                               | `false`                                                 |
| `ingress.annotations`                     | Ingress annotations (values are templated)    | `{}`                                                    |
| `ingress.labels`                          | Custom labels                                 | `{}`                                                    |
| `ingress.path`                            | Ingress accepted path                         | `/`                                                     |
| `ingress.pathType`                        | Ingress type of path                          | `Prefix`                                                |
| `ingress.hosts`                           | Ingress accepted hostnames                    | `["chart-example.local"]`                                                    |
| `ingress.extraPaths`                      | Ingress extra paths to prepend to every host configuration. Useful when configuring [custom actions with AWS ALB Ingress Controller](https://kubernetes-sigs.github.io/aws-alb-ingress-controller/guide/ingress/annotation/#actions). Requires `ingress.hosts` to have one or more host entries. | `[]`                                                    |
| `ingress.tls`                             | Ingress TLS configuration                     | `[]`                                                    |
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
| `persistence.existingClaim`               | Use an existing PVC to persist data           | `nil`                                                   |
| `persistence.storageClassName`            | Type of persistent volume claim               | `nil`                                                   |
| `persistence.accessModes`                 | Persistence access modes                      | `[ReadWriteOnce]`                                       |
| `persistence.annotations`                 | PersistentVolumeClaim annotations             | `{}`                                                    |
| `persistence.finalizers`                  | PersistentVolumeClaim finalizers              | `[ "kubernetes.io/pvc-protection" ]`                    |
| `persistence.subPath`                     | Mount a sub dir of the persistent volume      | `nil`                                                   |
| `persistence.inMemory.enabled`            | If persistence is not enabled, whether to mount the local storage in-memory to improve performance | `false`                                                   |
| `persistence.inMemory.sizeLimit`          | SizeLimit for the in-memory local storage     | `nil`                                                   |
| `initChownData.enabled`                   | If false, don't reset data ownership at startup | true                                                  |
| `initChownData.image.repository`          | init-chown-data container image repository    | `busybox`                                               |
| `initChownData.image.tag`                 | init-chown-data container image tag           | `1.31.1`                                                |
| `initChownData.image.sha`                 | init-chown-data container image sha (optional)| `""`                                                    |
| `initChownData.image.pullPolicy`          | init-chown-data container image pull policy   | `IfNotPresent`                                          |
| `initChownData.resources`                 | init-chown-data pod resource requests & limits | `{}`                                                   |
| `schedulerName`                           | Alternate scheduler name                      | `nil`                                                   |
| `env`                                     | Extra environment variables passed to pods    | `{}`                                                    |
| `envValueFrom`                            | Environment variables from alternate sources. See the API docs on [EnvVarSource](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.17/#envvarsource-v1-core) for format details.  | `{}` |
| `envFromSecret`                           | Name of a Kubernetes secret (must be manually created in the same namespace) containing values to be added to the environment. Can be templated | `""` |
| `envRenderSecret`                         | Sensible environment variables passed to pods and stored as secret | `{}`                               |
| `enableServiceLinks`                      | Inject Kubernetes services as environment variables. | `true`                                           |
| `extraSecretMounts`                       | Additional grafana server secret mounts       | `[]`                                                    |
| `extraVolumeMounts`                       | Additional grafana server volume mounts       | `[]`                                                    |
| `extraConfigmapMounts`                    | Additional grafana server configMap volume mounts | `[]`                                                |
| `extraEmptyDirMounts`                     | Additional grafana server emptyDir volume mounts | `[]`                                                 |
| `plugins`                                 | Plugins to be loaded along with Grafana       | `[]`                                                    |
| `datasources`                             | Configure grafana datasources (passed through tpl) | `{}`                                               |
| `notifiers`                               | Configure grafana notifiers                   | `{}`                                                    |
| `dashboardProviders`                      | Configure grafana dashboard providers         | `{}`                                                    |
| `dashboards`                              | Dashboards to import                          | `{}`                                                    |
| `dashboardsConfigMaps`                    | ConfigMaps reference that contains dashboards | `{}`                                                    |
| `grafana.ini`                             | Grafana's primary configuration               | `{}`                                                    |
| `ldap.enabled`                            | Enable LDAP authentication                    | `false`                                                 |
| `ldap.existingSecret`                     | The name of an existing secret containing the `ldap.toml` file, this must have the key `ldap-toml`. | `""` |
| `ldap.config`                             | Grafana's LDAP configuration                  | `""`                                                    |
| `annotations`                             | Deployment annotations                        | `{}`                                                    |
| `labels`                                  | Deployment labels                             | `{}`                                                    |
| `podAnnotations`                          | Pod annotations                               | `{}`                                                    |
| `podLabels`                               | Pod labels                                    | `{}`                                                    |
| `podPortName`                             | Name of the grafana port on the pod           | `grafana`                                               |
| `sidecar.image.repository`                | Sidecar image repository                      | `quay.io/kiwigrid/k8s-sidecar`                          |
| `sidecar.image.tag`                       | Sidecar image tag                             | `1.15.6`                                                |
| `sidecar.image.sha`                       | Sidecar image sha (optional)                  | `""`                                                    |
| `sidecar.imagePullPolicy`                 | Sidecar image pull policy                     | `IfNotPresent`                                          |
| `sidecar.resources`                       | Sidecar resources                             | `{}`                                                    |
| `sidecar.securityContext`                 | Sidecar securityContext                       | `{}`                                                    |
| `sidecar.enableUniqueFilenames`           | Sets the kiwigrid/k8s-sidecar UNIQUE_FILENAMES environment variable. If set to `true` the sidecar will create unique filenames where duplicate data keys exist between ConfigMaps and/or Secrets within the same or multiple Namespaces. | `false`                           |
| `sidecar.dashboards.enabled`              | Enables the cluster wide search for dashboards and adds/updates/deletes them in grafana | `false`       |
| `sidecar.dashboards.SCProvider`           | Enables creation of sidecar provider          | `true`                                                  |
| `sidecar.dashboards.provider.name`        | Unique name of the grafana provider           | `sidecarProvider`                                       |
| `sidecar.dashboards.provider.orgid`       | Id of the organisation, to which the dashboards should be added | `1`                                   |
| `sidecar.dashboards.provider.folder`      | Logical folder in which grafana groups dashboards | `""`                                                |
| `sidecar.dashboards.provider.disableDelete` | Activate to avoid the deletion of imported dashboards | `false`                                       |
| `sidecar.dashboards.provider.allowUiUpdates` | Allow updating provisioned dashboards from the UI | `false`                                          |
| `sidecar.dashboards.provider.type`        | Provider type                                 | `file`                                                  |
| `sidecar.dashboards.provider.foldersFromFilesStructure`        | Allow Grafana to replicate dashboard structure from filesystem.                                 | `false`                                                  |
| `sidecar.dashboards.watchMethod`          | Method to use to detect ConfigMap changes. With WATCH the sidecar will do a WATCH requests, with SLEEP it will list all ConfigMaps, then sleep for 60 seconds. | `WATCH` |
| `sidecar.skipTlsVerify`                   | Set to true to skip tls verification for kube api calls | `nil`                                         |
| `sidecar.dashboards.label`                | Label that config maps with dashboards should have to be added | `grafana_dashboard`                                |
| `sidecar.dashboards.labelValue`                | Label value that config maps with dashboards should have to be added | `nil`                                |
| `sidecar.dashboards.folder`               | Folder in the pod that should hold the collected dashboards (unless `sidecar.dashboards.defaultFolderName` is set). This path will be mounted. | `/tmp/dashboards`    |
| `sidecar.dashboards.folderAnnotation`     | The annotation the sidecar will look for in configmaps to override the destination folder for files | `nil`                                                  |
| `sidecar.dashboards.defaultFolderName`    | The default folder name, it will create a subfolder under the `sidecar.dashboards.folder` and put dashboards in there instead | `nil`                                |
| `sidecar.dashboards.searchNamespace`      | Namespaces list. If specified, the sidecar will search for dashboards config-maps  inside these namespaces.Otherwise the namespace in which the sidecar is running will be used.It's also possible to specify ALL to search in all namespaces. | `nil`                                |
| `sidecar.dashboards.script`               | Absolute path to shell script to execute after a configmap got reloaded. | `nil`                                |
| `sidecar.dashboards.resource`             | Should the sidecar looks into secrets, configmaps or both. | `both`                               |
| `sidecar.dashboards.extraMounts`          | Additional dashboard sidecar volume mounts. | `[]`                               |
| `sidecar.datasources.enabled`             | Enables the cluster wide search for datasources and adds/updates/deletes them in grafana |`false`       |
| `sidecar.datasources.label`               | Label that config maps with datasources should have to be added | `grafana_datasource`                               |
| `sidecar.datasources.labelValue`          | Label value that config maps with datasources should have to be added | `nil`                                |
| `sidecar.datasources.searchNamespace`     | Namespaces list. If specified, the sidecar will search for datasources config-maps  inside these namespaces.Otherwise the namespace in which the sidecar is running will be used.It's also possible to specify ALL to search in all namespaces. | `nil`                               |
| `sidecar.datasources.resource`            | Should the sidecar looks into secrets, configmaps or both. | `both`                               |
| `sidecar.datasources.reloadURL`           | Full url of datasource configuration reload API endpoint, to invoke after a config-map change | `"http://localhost:3000/api/admin/provisioning/datasources/reload"` |
| `sidecar.datasources.skipReload`          | Enabling this omits defining the REQ_URL and REQ_METHOD environment variables | `false` |
| `sidecar.notifiers.enabled`               | Enables the cluster wide search for notifiers and adds/updates/deletes them in grafana | `false`        |
| `sidecar.notifiers.label`                 | Label that config maps with notifiers should have to be added | `grafana_notifier`                               |
| `sidecar.notifiers.searchNamespace`       | Namespaces list. If specified, the sidecar will search for notifiers config-maps (or secrets) inside these namespaces.Otherwise the namespace in which the sidecar is running will be used.It's also possible to specify ALL to search in all namespaces. | `nil`                               |
| `sidecar.notifiers.resource`              | Should the sidecar looks into secrets, configmaps or both. | `both`                               |
| `smtp.existingSecret`                     | The name of an existing secret containing the SMTP credentials. | `""`                                  |
| `smtp.userKey`                            | The key in the existing SMTP secret containing the username. | `"user"`                                 |
| `smtp.passwordKey`                        | The key in the existing SMTP secret containing the password. | `"password"`                             |
| `admin.existingSecret`                    | The name of an existing secret containing the admin credentials. | `""`                                 |
| `admin.userKey`                           | The key in the existing admin secret containing the username. | `"admin-user"`                          |
| `admin.passwordKey`                       | The key in the existing admin secret containing the password. | `"admin-password"`                      |
| `serviceAccount.autoMount`                | Automount the service account token in the pod| `true`                                                  |
| `serviceAccount.annotations`              | ServiceAccount annotations                    |                                                         |
| `serviceAccount.create`                   | Create service account                        | `true`                                                  |
| `serviceAccount.name`                     | Service account name to use, when empty will be set to created account if `serviceAccount.create` is set else to `default` | `` |
| `serviceAccount.nameTest`                 | Service account name to use for test, when empty will be set to created account if `serviceAccount.create` is set else to `default` | `nil` |
| `rbac.create`                             | Create and use RBAC resources                 | `true`                                                  |
| `rbac.namespaced`                         | Creates Role and Rolebinding instead of the default ClusterRole and ClusteRoleBindings for the grafana instance  | `false` |
| `rbac.useExistingRole`                    | Set to a rolename to use existing role - skipping role creating - but still doing serviceaccount and rolebinding to the rolename set here. | `nil` |
| `rbac.pspEnabled`                         | Create PodSecurityPolicy (with `rbac.create`, grant roles permissions as well) | `true`                 |
| `rbac.pspUseAppArmor`                     | Enforce AppArmor in created PodSecurityPolicy (requires `rbac.pspEnabled`)  | `true`                    |
| `rbac.extraRoleRules`                     | Additional rules to add to the Role           | []                                                      |
| `rbac.extraClusterRoleRules`              | Additional rules to add to the ClusterRole    | []                                                      |
| `command`                     | Define command to be executed by grafana container at startup  | `nil`                                              |
| `testFramework.enabled`                   | Whether to create test-related resources      | `true`                                                  |
| `testFramework.image`                     | `test-framework` image repository.            | `bats/bats`                                             |
| `testFramework.tag`                       | `test-framework` image tag.                   | `v1.4.1`                                                |
| `testFramework.imagePullPolicy`           | `test-framework` image pull policy.           | `IfNotPresent`                                          |
| `testFramework.securityContext`           | `test-framework` securityContext              | `{}`                                                    |
| `downloadDashboards.env`                  | Environment variables to be passed to the `download-dashboards` container | `{}`                        |
| `downloadDashboards.envFromSecret`        | Name of a Kubernetes secret (must be manually created in the same namespace) containing values to be added to the environment. Can be templated | `""` |
| `downloadDashboards.resources`            | Resources of `download-dashboards` container  | `{}`                                                    |
| `downloadDashboardsImage.repository`      | Curl docker image repo                        | `curlimages/curl`                                       |
| `downloadDashboardsImage.tag`             | Curl docker image tag                         | `7.73.0`                                                |
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
| `serviceMonitor.relabelings`              | MetricRelabelConfigs to apply to samples before ingestion.  | `[]`                                      |
| `revisionHistoryLimit`                    | Number of old ReplicaSets to retain           | `10`                                                    |
| `imageRenderer.enabled`                    | Enable the image-renderer deployment & service                                     | `false`                          |
| `imageRenderer.image.repository`           | image-renderer Image repository                                                    | `grafana/grafana-image-renderer` |
| `imageRenderer.image.tag`                  | image-renderer Image tag                                                           | `latest`                         |
| `imageRenderer.image.sha`                  | image-renderer Image sha (optional)                                                | `""`                             |
| `imageRenderer.image.pullPolicy`           | image-renderer ImagePullPolicy                                                     | `Always`                         |
| `imageRenderer.env`                        | extra env-vars for image-renderer                                                  | `{}`                             |
| `imageRenderer.serviceAccountName`         | image-renderer deployment serviceAccountName                                       | `""`                             |
| `imageRenderer.securityContext`            | image-renderer deployment securityContext                                          | `{}`                             |
| `imageRenderer.hostAliases`                | image-renderer deployment Host Aliases                                             | `[]`                             |
| `imageRenderer.priorityClassName`          | image-renderer deployment priority class                                           | `''`                             |
| `imageRenderer.service.enabled`            | Enable the image-renderer service                                                  | `true`                           |
| `imageRenderer.service.portName`           | image-renderer service port name                                                   | `http`                           |
| `imageRenderer.service.port`               | image-renderer service port used by both service and deployment                    | `8081`                           |
| `imageRenderer.grafanaProtocol`            | Protocol to use for image renderer callback url                                    | `http`                         |
| `imageRenderer.grafanaSubPath`             | Grafana sub path to use for image renderer callback url                            | `''`                             |
| `imageRenderer.podPortName`                | name of the image-renderer port on the pod                                         | `http`                           |
| `imageRenderer.revisionHistoryLimit`       | number of image-renderer replica sets to keep                                      | `10`                             |
| `imageRenderer.networkPolicy.limitIngress` | Enable a NetworkPolicy to limit inbound traffic from only the created grafana pods  | `true`                           |
| `imageRenderer.networkPolicy.limitEgress`  | Enable a NetworkPolicy to limit outbound traffic to only the created grafana pods   | `false`                          |
| `imageRenderer.resources`                  | Set resource limits for image-renderer pdos                                        | `{}`                             |
| `networkPolicy.enabled`                    | Enable creation of NetworkPolicy resources.                                                                              | `false`             |
| `networkPolicy.allowExternal`              | Don't require client label for connections                                                                               | `true`              |
| `networkPolicy.explicitNamespacesSelector` | A Kubernetes LabelSelector to explicitly select namespaces from which traffic could be allowed                           | `{}`                |
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

### Example of extraVolumeMounts

Volume can be type persistentVolumeClaim or hostPath but not both at same time.
If none existingClaim or hostPath argument is givent then type is emptyDir.

```yaml
- extraVolumeMounts:
  - name: plugins
    mountPath: /var/lib/grafana/plugins
    subPath: configs/grafana/plugins
    existingClaim: existing-grafana-claim
    readOnly: false
  - name: dashboards
    mountPath: /var/lib/grafana/dashboards
    hostPath: /usr/shared/grafana/dashboards
    readOnly: false
```

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
    local-dashboard:
      url: https://raw.githubusercontent.com/user/repository/master/dashboards/dashboard.json
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

Secrets are recommended over configmaps for this usecase because datasources usually contain private
data like usernames and passwords. Secrets are the more appropriate cluster resource to manage those.

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

This example uses Grafana uses [file providers](https://grafana.com/docs/grafana/latest/administration/configuration/#file-provider) for secret values and the `extraSecretMounts` configuration flag (Additional grafana server secret mounts) to mount the secrets.

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
- extraSecretMounts:
  - name: auth-generic-oauth-secret-mount
    secretName: auth-generic-oauth-secret
    defaultMode: 0440
    mountPath: /etc/secrets/auth_generic_oauth
    readOnly: true
```

### extraSecretMounts using a Container Storage Interface (CSI) provider

This example uses a CSI driver e.g. retrieving secrets using [Azure Key Vault Provider](https://github.com/Azure/secrets-store-csi-driver-provider-azure)

```yaml
- extraSecretMounts:
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
  alerting:
    enabled: false
```
