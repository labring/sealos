## Higress for Kubernetes

Higress is a cloud-native api gateway based on Alibaba's internal gateway practices.

Powered by Istio and Envoy, Higress realizes the integration of the triple gateway architecture of traffic gateway, microservice gateway and security gateway, thereby greatly reducing the costs of deployment, operation and maintenance.

## Setup Repo Info

```console
helm repo add higress.io https://higress.io/helm-charts
helm repo update
```

## Install

To install the chart with the release name `higress`:

```console
helm install higress -n higress-system higress.io/higress --create-namespace --render-subchart-notes
```

## Uninstall

To uninstall/delete the higress deployment:

```console
helm delete higress -n higress-system
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Parameters

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| clusterName | string | `""` |  |
| controller.affinity | object | `{}` |  |
| controller.automaticHttps.email | string | `""` |  |
| controller.automaticHttps.enabled | bool | `true` |  |
| controller.autoscaling.enabled | bool | `false` |  |
| controller.autoscaling.maxReplicas | int | `5` |  |
| controller.autoscaling.minReplicas | int | `1` |  |
| controller.autoscaling.targetCPUUtilizationPercentage | int | `80` |  |
| controller.env | object | `{}` |  |
| controller.hub | string | `"higress-registry.cn-hangzhou.cr.aliyuncs.com/higress"` |  |
| controller.image | string | `"higress"` |  |
| controller.imagePullSecrets | list | `[]` |  |
| controller.labels | object | `{}` |  |
| controller.name | string | `"higress-controller"` |  |
| controller.nodeSelector | object | `{}` |  |
| controller.podAnnotations | object | `{}` |  |
| controller.podLabels | object | `{}` | Labels to apply to the pod |
| controller.podSecurityContext | object | `{}` |  |
| controller.ports[0].name | string | `"http"` |  |
| controller.ports[0].port | int | `8888` |  |
| controller.ports[0].protocol | string | `"TCP"` |  |
| controller.ports[0].targetPort | int | `8888` |  |
| controller.ports[1].name | string | `"http-solver"` |  |
| controller.ports[1].port | int | `8889` |  |
| controller.ports[1].protocol | string | `"TCP"` |  |
| controller.ports[1].targetPort | int | `8889` |  |
| controller.ports[2].name | string | `"grpc"` |  |
| controller.ports[2].port | int | `15051` |  |
| controller.ports[2].protocol | string | `"TCP"` |  |
| controller.ports[2].targetPort | int | `15051` |  |
| controller.probe.httpGet.path | string | `"/ready"` |  |
| controller.probe.httpGet.port | int | `8888` |  |
| controller.probe.initialDelaySeconds | int | `1` |  |
| controller.probe.periodSeconds | int | `3` |  |
| controller.probe.timeoutSeconds | int | `5` |  |
| controller.rbac.create | bool | `true` |  |
| controller.replicas | int | `1` | Number of Higress Controller pods |
| controller.resources.limits.cpu | string | `"1000m"` |  |
| controller.resources.limits.memory | string | `"2048Mi"` |  |
| controller.resources.requests.cpu | string | `"500m"` |  |
| controller.resources.requests.memory | string | `"2048Mi"` |  |
| controller.securityContext | object | `{}` |  |
| controller.service.type | string | `"ClusterIP"` |  |
| controller.serviceAccount.annotations | object | `{}` | Annotations to add to the service account |
| controller.serviceAccount.create | bool | `true` | Specifies whether a service account should be created |
| controller.serviceAccount.name | string | `""` | If not set and create is true, a name is generated using the fullname template |
| controller.tag | string | `""` |  |
| controller.tolerations | list | `[]` |  |
| downstream | object | `{"connectionBufferLimits":32768,"http2":{"initialConnectionWindowSize":1048576,"initialStreamWindowSize":65535,"maxConcurrentStreams":100},"idleTimeout":180,"maxRequestHeadersKb":60,"routeTimeout":0}` | Downstream config settings |
| gateway.affinity | object | `{}` |  |
| gateway.annotations | object | `{}` | Annotations to apply to all resources |
| gateway.autoscaling.enabled | bool | `false` |  |
| gateway.autoscaling.maxReplicas | int | `5` |  |
| gateway.autoscaling.minReplicas | int | `1` |  |
| gateway.autoscaling.targetCPUUtilizationPercentage | int | `80` |  |
| gateway.containerSecurityContext | string | `nil` |  |
| gateway.env | object | `{}` | Pod environment variables |
| gateway.hostNetwork | bool | `false` |  |
| gateway.httpPort | int | `80` |  |
| gateway.httpsPort | int | `443` |  |
| gateway.hub | string | `"higress-registry.cn-hangzhou.cr.aliyuncs.com/higress"` |  |
| gateway.image | string | `"gateway"` |  |
| gateway.kind | string | `"Deployment"` | Use a `DaemonSet` or `Deployment` |
| gateway.labels | object | `{}` | Labels to apply to all resources |
| gateway.metrics.enabled | bool | `false` | If true, create PodMonitor or VMPodScrape for gateway |
| gateway.metrics.honorLabels | bool | `false` |  |
| gateway.metrics.interval | string | `""` |  |
| gateway.metrics.metricRelabelConfigs | list | `[]` | for operator.victoriametrics.com/v1beta1.VMPodScrape |
| gateway.metrics.metricRelabelings | list | `[]` | for monitoring.coreos.com/v1.PodMonitor |
| gateway.metrics.provider | string | `"monitoring.coreos.com"` | provider group name for CustomResourceDefinition, can be monitoring.coreos.com or operator.victoriametrics.com |
| gateway.metrics.rawSpec | object | `{}` | some more raw podMetricsEndpoints spec |
| gateway.metrics.relabelConfigs | list | `[]` |  |
| gateway.metrics.relabelings | list | `[]` |  |
| gateway.metrics.scrapeTimeout | string | `""` |  |
| gateway.name | string | `"higress-gateway"` |  |
| gateway.networkGateway | string | `""` | If specified, the gateway will act as a network gateway for the given network. |
| gateway.nodeSelector | object | `{}` |  |
| gateway.podAnnotations."prometheus.io/path" | string | `"/stats/prometheus"` |  |
| gateway.podAnnotations."prometheus.io/port" | string | `"15020"` |  |
| gateway.podAnnotations."prometheus.io/scrape" | string | `"true"` |  |
| gateway.podAnnotations."sidecar.istio.io/inject" | string | `"false"` |  |
| gateway.podLabels | object | `{}` | Labels to apply to the pod |
| gateway.rbac.enabled | bool | `true` | If enabled, roles will be created to enable accessing certificates from Gateways. This is not needed when using http://gateway-api.org/. |
| gateway.readinessFailureThreshold | int | `30` | The number of successive failed probes before indicating readiness failure. |
| gateway.readinessInitialDelaySeconds | int | `1` | The initial delay for readiness probes in seconds. |
| gateway.readinessPeriodSeconds | int | `2` | The period between readiness probes. |
| gateway.readinessSuccessThreshold | int | `1` | The number of successive successed probes before indicating readiness success. |
| gateway.readinessTimeoutSeconds | int | `3` | The readiness timeout seconds |
| gateway.replicas | int | `2` | Number of Higress Gateway pods |
| gateway.resources.limits.cpu | string | `"2000m"` |  |
| gateway.resources.limits.memory | string | `"2048Mi"` |  |
| gateway.resources.requests.cpu | string | `"2000m"` |  |
| gateway.resources.requests.memory | string | `"2048Mi"` |  |
| gateway.revision | string | `""` | revision declares which revision this gateway is a part of |
| gateway.rollingMaxSurge | string | `"100%"` |  |
| gateway.rollingMaxUnavailable | string | `"25%"` | If global.local is true, the default value is 100%, otherwise it is 25% |
| gateway.securityContext | string | `nil` | Define the security context for the pod. If unset, this will be automatically set to the minimum privileges required to bind to port 80 and 443. On Kubernetes 1.22+, this only requires the `net.ipv4.ip_unprivileged_port_start` sysctl. |
| gateway.service.annotations | object | `{}` |  |
| gateway.service.externalTrafficPolicy | string | `""` |  |
| gateway.service.loadBalancerClass | string | `""` |  |
| gateway.service.loadBalancerIP | string | `""` |  |
| gateway.service.loadBalancerSourceRanges | list | `[]` |  |
| gateway.service.ports[0].name | string | `"http2"` |  |
| gateway.service.ports[0].port | int | `80` |  |
| gateway.service.ports[0].protocol | string | `"TCP"` |  |
| gateway.service.ports[0].targetPort | int | `80` |  |
| gateway.service.ports[1].name | string | `"https"` |  |
| gateway.service.ports[1].port | int | `443` |  |
| gateway.service.ports[1].protocol | string | `"TCP"` |  |
| gateway.service.ports[1].targetPort | int | `443` |  |
| gateway.service.type | string | `"LoadBalancer"` | Type of service. Set to "None" to disable the service entirely |
| gateway.serviceAccount.annotations | object | `{}` | Annotations to add to the service account |
| gateway.serviceAccount.create | bool | `true` | If set, a service account will be created. Otherwise, the default is used |
| gateway.serviceAccount.name | string | `""` | The name of the service account to use. If not set, the release name is used |
| gateway.tag | string | `""` |  |
| gateway.tolerations | list | `[]` |  |
| gateway.unprivilegedPortSupported | string | `nil` |  |
| global.autoscalingv2API | bool | `true` | whether to use autoscaling/v2 template for HPA settings for internal usage only, not to be configured by users. |
| global.caAddress | string | `""` | The customized CA address to retrieve certificates for the pods in the cluster. CSR clients such as the Istio Agent and ingress gateways can use this to specify the CA endpoint. If not set explicitly, default to the Istio discovery address. |
| global.caName | string | `""` | The name of the CA for workload certificates. For example, when caName=GkeWorkloadCertificate, GKE workload certificates will be used as the certificates for workloads. The default value is "" and when caName="", the CA will be configured by other mechanisms (e.g., environmental variable CA_PROVIDER). |
| global.configCluster | bool | `false` | Configure a remote cluster as the config cluster for an external istiod. |
| global.defaultPodDisruptionBudget | object | `{"enabled":false}` | enable pod disruption budget for the control plane, which is used to ensure Istio control plane components are gradually upgraded or recovered. |
| global.defaultResources | object | `{"requests":{"cpu":"10m"}}` | A minimal set of requested resources to applied to all deployments so that Horizontal Pod Autoscaler will be able to function (if set). Each component can overwrite these default values by adding its own resources block in the relevant section below and setting the desired resources values. |
| global.defaultUpstreamConcurrencyThreshold | int | `10000` |  |
| global.disableAlpnH2 | bool | `false` | Whether to disable HTTP/2 in ALPN |
| global.enableGatewayAPI | bool | `false` | If true, Higress Controller will monitor Gateway API resources as well |
| global.enableH3 | bool | `false` |  |
| global.enableIPv6 | bool | `false` |  |
| global.enableIstioAPI | bool | `true` | If true, Higress Controller will monitor istio resources as well |
| global.enableLDSCache | bool | `false` |  |
| global.enableProxyProtocol | bool | `false` |  |
| global.enablePushAllMCPClusters | bool | `true` |  |
| global.enableRedis | bool | `false` | Whether to enable Redis(redis-stack-server) for Higress, default is false. |
| global.enableSRDS | bool | `true` |  |
| global.enableStatus | bool | `true` | If true, Higress Controller will update the status field of Ingress resources. When migrating from Nginx Ingress, in order to avoid status field of Ingress objects being overwritten, this parameter needs to be set to false, so Higress won't write the entry IP to the status field of the corresponding Ingress object. |
| global.externalIstiod | bool | `false` | Configure a remote cluster data plane controlled by an external istiod. When set to true, istiod is not deployed locally and only a subset of the other discovery charts are enabled. |
| global.hostRDSMergeSubset | bool | `false` |  |
| global.hub | string | `"higress-registry.cn-hangzhou.cr.aliyuncs.com/higress"` | Default hub for Istio images. Releases are published to docker hub under 'istio' project. Dev builds from prow are on gcr.io |
| global.imagePullPolicy | string | `""` | Specify image pull policy if default behavior isn't desired. Default behavior: latest images will be Always else IfNotPresent. |
| global.imagePullSecrets | list | `[]` | ImagePullSecrets for all ServiceAccount, list of secrets in the same namespace to use for pulling any images in pods that reference this ServiceAccount. For components that don't use ServiceAccounts (i.e. grafana, servicegraph, tracing) ImagePullSecrets will be added to the corresponding Deployment(StatefulSet) objects. Must be set for any cluster configured with private docker registry. |
| global.ingressClass | string | `"higress"` | IngressClass filters which ingress resources the higress controller watches. The default ingress class is higress. There are some special cases for special ingress class. 1. When the ingress class is set as nginx, the higress controller will watch ingress resources with the nginx ingress class or without any ingress class. 2. When the ingress class is set empty, the higress controller will watch all ingress resources in the k8s cluster. |
| global.istioNamespace | string | `"istio-system"` | Used to locate istiod. |
| global.istiod | object | `{"enableAnalysis":false}` | Enabled by default in master for maximising testing. |
| global.jwtPolicy | string | `"third-party-jwt"` | Configure the policy for validating JWT. Currently, two options are supported: "third-party-jwt" and "first-party-jwt". |
| global.kind | bool | `false` |  |
| global.liteMetrics | bool | `false` |  |
| global.local | bool | `false` | When deploying to a local cluster (e.g.: kind cluster), set this to true. |
| global.logAsJson | bool | `false` |  |
| global.logging | object | `{"level":"default:info"}` | Comma-separated minimum per-scope logging level of messages to output, in the form of <scope>:<level>,<scope>:<level> The control plane has different scopes depending on component, but can configure default log level across all components If empty, default scope and level will be used as configured in code |
| global.meshID | string | `""` | If the mesh admin does not specify a value, Istio will use the value of the mesh's Trust Domain. The best practice is to select a proper Trust Domain value. |
| global.meshNetworks | object | `{}` |  |
| global.mountMtlsCerts | bool | `false` | Use the user-specified, secret volume mounted key and certs for Pilot and workloads. |
| global.multiCluster.clusterName | string | `""` | Should be set to the name of the cluster this installation will run in. This is required for sidecar injection to properly label proxies |
| global.multiCluster.enabled | bool | `true` | Set to true to connect two kubernetes clusters via their respective ingressgateway services when pods in each cluster cannot directly talk to one another. All clusters should be using Istio mTLS and must have a shared root CA for this model to work. |
| global.network | string | `""` | Network defines the network this cluster belong to. This name corresponds to the networks in the map of mesh networks. |
| global.o11y | object | `{"enabled":false,"promtail":{"image":{"repository":"higress-registry.cn-hangzhou.cr.aliyuncs.com/higress/promtail","tag":"2.9.4"},"port":3101,"resources":{"limits":{"cpu":"500m","memory":"2Gi"}},"securityContext":{}}}` | Observability (o11y) configurations |
| global.omitSidecarInjectorConfigMap | bool | `false` |  |
| global.onDemandRDS | bool | `false` |  |
| global.oneNamespace | bool | `false` | Whether to restrict the applications namespace the controller manages; If not set, controller watches all namespaces |
| global.onlyPushRouteCluster | bool | `true` |  |
| global.operatorManageWebhooks | bool | `false` | Configure whether Operator manages webhook configurations. The current behavior of Istiod is to manage its own webhook configurations. When this option is set as true, Istio Operator, instead of webhooks, manages the webhook configurations. When this option is set as false, webhooks manage their own webhook configurations. |
| global.pilotCertProvider | string | `"istiod"` | Configure the certificate provider for control plane communication. Currently, two providers are supported: "kubernetes" and "istiod". As some platforms may not have kubernetes signing APIs, Istiod is the default |
| global.priorityClassName | string | `""` | Kubernetes >=v1.11.0 will create two PriorityClass, including system-cluster-critical and system-node-critical, it is better to configure this in order to make sure your Istio pods will not be killed because of low priority class. Refer to https://kubernetes.io/docs/concepts/configuration/pod-priority-preemption/#priorityclass for more detail. |
| global.proxy.autoInject | string | `"enabled"` | This controls the 'policy' in the sidecar injector. |
| global.proxy.clusterDomain | string | `"cluster.local"` | CAUTION: It is important to ensure that all Istio helm charts specify the same clusterDomain value cluster domain. Default value is "cluster.local". |
| global.proxy.componentLogLevel | string | `"misc:error"` | Per Component log level for proxy, applies to gateways and sidecars. If a component level is not set, then the global "logLevel" will be used. |
| global.proxy.enableCoreDump | bool | `false` | If set, newly injected sidecars will have core dumps enabled. |
| global.proxy.excludeIPRanges | string | `""` |  |
| global.proxy.excludeInboundPorts | string | `""` |  |
| global.proxy.excludeOutboundPorts | string | `""` |  |
| global.proxy.holdApplicationUntilProxyStarts | bool | `false` | Controls if sidecar is injected at the front of the container list and blocks the start of the other containers until the proxy is ready |
| global.proxy.image | string | `"proxyv2"` |  |
| global.proxy.includeIPRanges | string | `"*"` | istio egress capture allowlist https://istio.io/docs/tasks/traffic-management/egress.html#calling-external-services-directly example: includeIPRanges: "172.30.0.0/16,172.20.0.0/16" would only capture egress traffic on those two IP Ranges, all other outbound traffic would be allowed by the sidecar |
| global.proxy.includeInboundPorts | string | `"*"` |  |
| global.proxy.includeOutboundPorts | string | `""` |  |
| global.proxy.logLevel | string | `"warning"` | Log level for proxy, applies to gateways and sidecars. Expected values are: trace|debug|info|warning|error|critical|off |
| global.proxy.privileged | bool | `false` | If set to true, istio-proxy container will have privileged securityContext |
| global.proxy.proxyStatsMatcher | object | `{"inclusionRegexps":[".*"]}` | Proxy stats name regexps matcher for inclusion |
| global.proxy.readinessFailureThreshold | int | `30` | The number of successive failed probes before indicating readiness failure. |
| global.proxy.readinessInitialDelaySeconds | int | `1` | The initial delay for readiness probes in seconds. |
| global.proxy.readinessPeriodSeconds | int | `2` | The period between readiness probes. |
| global.proxy.readinessSuccessThreshold | int | `30` | The number of successive successed probes before indicating readiness success. |
| global.proxy.readinessTimeoutSeconds | int | `3` | The readiness timeout seconds |
| global.proxy.resources | object | `{"limits":{"cpu":"2000m","memory":"1024Mi"},"requests":{"cpu":"100m","memory":"128Mi"}}` | Resources for the sidecar. |
| global.proxy.statusPort | int | `15020` | Default port for Pilot agent health checks. A value of 0 will disable health checking. |
| global.proxy.tracer | string | `""` | Specify which tracer to use. One of: lightstep, datadog, stackdriver. If using stackdriver tracer outside GCP, set env GOOGLE_APPLICATION_CREDENTIALS to the GCP credential file. |
| global.proxy_init.image | string | `"proxyv2"` | Base name for the proxy_init container, used to configure iptables. |
| global.proxy_init.resources.limits.cpu | string | `"2000m"` |  |
| global.proxy_init.resources.limits.memory | string | `"1024Mi"` |  |
| global.proxy_init.resources.requests.cpu | string | `"10m"` |  |
| global.proxy_init.resources.requests.memory | string | `"10Mi"` |  |
| global.remotePilotAddress | string | `""` | configure remote pilot and istiod service and endpoint |
| global.sds.token | object | `{"aud":"istio-ca"}` | The JWT token for SDS and the aud field of such JWT. See RFC 7519, section 4.1.3. When a CSR is sent from Istio Agent to the CA (e.g. Istiod), this aud is to make sure the JWT is intended for the CA. |
| global.sts.servicePort | int | `0` | The service port used by Security Token Service (STS) server to handle token exchange requests. Setting this port to a non-zero value enables STS server. |
| global.tracer | object | `{"datadog":{"address":"$(HOST_IP):8126"},"lightstep":{"accessToken":"","address":""},"stackdriver":{"debug":false,"maxNumberOfAnnotations":200,"maxNumberOfAttributes":200,"maxNumberOfMessageEvents":200}}` | Configuration for each of the supported tracers |
| global.tracer.datadog | object | `{"address":"$(HOST_IP):8126"}` | Configuration for envoy to send trace data to LightStep. Disabled by default. address: the <host>:<port> of the satellite pool accessToken: required for sending data to the pool  |
| global.tracer.datadog.address | string | `"$(HOST_IP):8126"` | Host:Port for submitting traces to the Datadog agent. |
| global.tracer.lightstep.accessToken | string | `""` | example: abcdefg1234567 |
| global.tracer.lightstep.address | string | `""` | example: lightstep-satellite:443 |
| global.tracer.stackdriver.debug | bool | `false` | enables trace output to stdout. |
| global.tracer.stackdriver.maxNumberOfAnnotations | int | `200` | The global default max number of annotation events per span. |
| global.tracer.stackdriver.maxNumberOfAttributes | int | `200` | The global default max number of attributes per span. |
| global.tracer.stackdriver.maxNumberOfMessageEvents | int | `200` | The global default max number of message events per span. |
| global.useMCP | bool | `false` | Use the Mesh Control Protocol (MCP) for configuring Istiod. Requires an MCP source. |
| global.watchNamespace | string | `""` | If not empty, Higress Controller will only watch resources in the specified namespace. When isolating different business systems using K8s namespace, if each namespace requires a standalone gateway instance, this parameter can be used to confine the Ingress watching of Higress within the given namespace. |
| global.xdsMaxRecvMsgSize | string | `"104857600"` |  |
| hub | string | `"higress-registry.cn-hangzhou.cr.aliyuncs.com/higress"` |  |
| meshConfig | object | `{"enablePrometheusMerge":true,"rootNamespace":null,"trustDomain":"cluster.local"}` | meshConfig defines runtime configuration of components, including Istiod and istio-agent behavior See https://istio.io/docs/reference/config/istio.mesh.v1alpha1/ for all available options |
| meshConfig.rootNamespace | string | `nil` | The namespace to treat as the administrative root namespace for Istio configuration. When processing a leaf namespace Istio will search for declarations in that namespace first and if none are found it will search in the root namespace. Any matching declaration found in the root namespace is processed as if it were declared in the leaf namespace. |
| meshConfig.trustDomain | string | `"cluster.local"` | The trust domain corresponds to the trust root of a system Refer to https://github.com/spiffe/spiffe/blob/master/standards/SPIFFE-ID.md#21-trust-domain |
| pilot.autoscaleEnabled | bool | `false` |  |
| pilot.autoscaleMax | int | `5` |  |
| pilot.autoscaleMin | int | `1` |  |
| pilot.configMap | bool | `true` | Install the mesh config map, generated from values.yaml. If false, pilot wil use default values (by default) or user-supplied values. |
| pilot.configSource | object | `{"subscribedResources":[]}` | This is used to set the source of configuration for the associated address in configSource, if nothing is specified the default MCP is assumed. |
| pilot.cpu.targetAverageUtilization | int | `80` |  |
| pilot.deploymentLabels | object | `{}` | Additional labels to apply to the deployment. |
| pilot.enableProtocolSniffingForInbound | bool | `true` | if protocol sniffing is enabled for inbound |
| pilot.enableProtocolSniffingForOutbound | bool | `true` | if protocol sniffing is enabled for outbound |
| pilot.env.PILOT_ENABLE_CROSS_CLUSTER_WORKLOAD_ENTRY | string | `"false"` |  |
| pilot.env.PILOT_ENABLE_METADATA_EXCHANGE | string | `"false"` |  |
| pilot.env.PILOT_SCOPE_GATEWAY_TO_NAMESPACE | string | `"false"` |  |
| pilot.env.VALIDATION_ENABLED | string | `"false"` |  |
| pilot.hub | string | `"higress-registry.cn-hangzhou.cr.aliyuncs.com/higress"` |  |
| pilot.image | string | `"pilot"` | Can be a full hub/image:tag |
| pilot.jwksResolverExtraRootCA | string | `""` | You can use jwksResolverExtraRootCA to provide a root certificate in PEM format. This will then be trusted by pilot when resolving JWKS URIs. |
| pilot.keepaliveMaxServerConnectionAge | string | `"30m"` | The following is used to limit how long a sidecar can be connected to a pilot. It balances out load across pilot instances at the cost of increasing system churn. |
| pilot.nodeSelector | object | `{}` |  |
| pilot.plugins | list | `[]` |  |
| pilot.podAnnotations | object | `{}` |  |
| pilot.podLabels | object | `{}` | Additional labels to apply on the pod level for monitoring and logging configuration. |
| pilot.replicaCount | int | `1` |  |
| pilot.resources | object | `{"requests":{"cpu":"500m","memory":"2048Mi"}}` | Resources for a small pilot install |
| pilot.rollingMaxSurge | string | `"100%"` |  |
| pilot.rollingMaxUnavailable | string | `"25%"` |  |
| pilot.serviceAnnotations | object | `{}` |  |
| pilot.tag | string | `""` |  |
| pilot.traceSampling | float | `1` |  |
| redis.redis.affinity | object | `{}` | Affinity for Redis |
| redis.redis.image | string | `"redis-stack-server"` | Specify the image |
| redis.redis.name | string | `"redis-stack-server"` |  |
| redis.redis.nodeSelector | object | `{}` | NodeSelector Node labels for Redis |
| redis.redis.password | string | `""` | Specify the password, if not set, no password is used |
| redis.redis.persistence.accessModes | list | `["ReadWriteOnce"]` | Persistent Volume access modes |
| redis.redis.persistence.enabled | bool | `false` | Enable persistence on Redis, default is false |
| redis.redis.persistence.size | string | `"1Gi"` | Persistent Volume size |
| redis.redis.persistence.storageClass | string | `""` | If undefined (the default) or set to null, no storageClassName spec is set, choosing the default provisioner |
| redis.redis.replicas | int | `1` | Specify the number of replicas |
| redis.redis.resources | object | `{}` | Specify the resources |
| redis.redis.service | object | `{"port":6379,"type":"ClusterIP"}` | Service parameters |
| redis.redis.service.port | int | `6379` | Exporter service port |
| redis.redis.service.type | string | `"ClusterIP"` | Exporter service type |
| redis.redis.tag | string | `"7.4.0-v3"` | Specify the tag |
| redis.redis.tolerations | list | `[]` | Tolerations for Redis |
| revision | string | `""` |  |
| tracing.enable | bool | `false` |  |
| tracing.sampling | int | `100` |  |
| tracing.skywalking.port | int | `11800` |  |
| tracing.skywalking.service | string | `""` |  |
| tracing.timeout | int | `500` |  |
| upstream | object | `{"connectionBufferLimits":10485760,"idleTimeout":10}` | Upstream config settings |