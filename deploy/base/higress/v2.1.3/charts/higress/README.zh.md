## Higress 适用于 Kubernetes

Higress 是基于阿里巴巴内部网关实践的云原生 API 网关。

通过 Istio 和 Envoy 的支持，Higress 实现了流量网关、微服务网关和安全网关三种架构的融合，从而极大地减少了部署、运维的成本。

## 设置仓库信息

```console
helm repo add higress.io https://higress.io/helm-charts
helm repo update
```

## 安装

使用 Helm 安装名为 `higress` 的组件：

```console
helm install higress -n higress-system higress.io/higress --create-namespace --render-subchart-notes
```

## 卸载

删除名称为 higress 的安装：

```console
helm delete higress -n higress-system
```

该命令将删除与组件关联的所有 Kubernetes 组件并卸载该发行版。

## 参数

## Values

| 键 | 类型 | 默认值 | 描述 |
|----|------|---------|-------------|
| clusterName | string | `""` | 集群名 |
| controller.affinity | object | `{}` | 控制器亲和性设置 |
| controller.automaticHttps.email | string | `""` | 自动 HTTPS 所需的邮件 |
| controller.automaticHttps.enabled | bool | `true` | 是否启用自动 HTTPS 功能 |
| controller.autoscaling.enabled | bool | `false` | 是否启用控制器的自动扩展功能 |
| controller.autoscaling.maxReplicas | int | `5` | 最大副本数 |
| controller.autoscaling.minReplicas | int | `1` | 最小副本数 |
| controller.autoscaling.targetCPUUtilizationPercentage | int | `80` | 目标 CPU 使用率百分比 |
| controller.env | object | `{}` | 环境变量 |
| controller.hub | string | `"higress-registry.cn-hangzhou.cr.aliyuncs.com/higress"` | 图像库的基础地址 |
| controller.image | string | `"higress"` | 镜像名称 |
| controller.imagePullSecrets | list | `[]` | 拉取秘钥列表 |
| controller.labels | object | `{}` | 标签 |
| controller.name | string | `"higress-controller"` | 控制器名称 |
| controller.nodeSelector | object | `{}` | 节点选择器 |
| controller.podAnnotations | object | `{}` | Pod 注解 |
| controller.podLabels | object | `{}` | 应用到 Pod 上的标签 |
| controller.podSecurityContext | object | `{}` | Pod 安全上下文 |
| controller.ports[0].name | string | `"http"` | 端口名称 |
| controller.ports[0].port | int | `8888` | 端口编号 |
| controller.ports[0].protocol | string | `"TCP"` | 协议类型 |
| controller.ports[0].targetPort | int | `8888` | 目标端口 |
| controller.ports[1].name | string | `"http-solver"` | 端口名称 |
| controller.ports[1].port | int | `8889` | 端口编号 |
| controller.ports[1].protocol | string | `"TCP"` | 协议类型 |
| controller.ports[1].targetPort | int | `8889` | 目标端口 |
| controller.ports[2].name | string | `"grpc"` | 端口名称 |
| controller.ports[2].port | int | `15051` | 端口编号 |
| controller.ports[2].protocol | string | `"TCP"` | 协议类型 |
| controller.ports[2].targetPort | int | `15051` | 目标端口 |
| controller.probe.httpGet.path | string | `"/ready"` | 运行状况检查路径 |
| controller.probe.httpGet.port | int | `8888` | 端口运行状态检查 |
| controller.probe.initialDelaySeconds | int | `1` | 初始延迟秒数 |
| controller.probe.periodSeconds | int | `3` | 健康检查间隔秒数 |
| controller.probe.timeoutSeconds | int | `5` | 超时秒数 |
| controller.rbac.create | bool | `true` | 是否创建 RBAC 相关资源 |
| controller.replicas | int | `1` | Higress 控制器 Pod 的数量 |
| controller.resources.limits.cpu | string | `"1000m"` | CPU 上限 |
| controller.resources.limits.memory | string | `"2048Mi"` | 内存上限 |
| controller.resources.requests.cpu | string | `"500m"` | CPU 请求量 |
| controller.resources.requests.memory | string | `"2048Mi"` | 内存请求量 |
| controller.securityContext | object | `{}` | 安全上下文 |
| controller.service.type | string | `"ClusterIP"` | 服务类型 |
| controller.serviceAccount.annotations | object | `{}` | 添加到服务帐户的注解 |
| controller.serviceAccount.create | bool | `true` | 是否创建服务帐户 |
| controller.serviceAccount.name | string | `""` | 如果未设置且 create 为 true，则从 fullname 模板生成名称 |
| controller.tag | string | `""` | 标记 |
| controller.tolerations | list | `[]` | 受容容忍度列表 |
| downstream.connectionBufferLimits | int | `32768` | 下游连接缓冲区限制（字节） |
| downstream.http2.initialConnectionWindowSize | int | `1048576` | HTTP/2 初始连接窗口大小 |
| downstream.http2.initialStreamWindowSize | int | `65535` | 流初始窗口大小 |
| downstream.http2.maxConcurrentStreams | int | `100` | 并发流最大数量 |
| downstream.idleTimeout | int | `180` | 空闲超时时间（秒） |
| downstream.maxRequestHeadersKb | int | `60` | 最大请求头大小（KB） |
| downstream.routeTimeout | int | `0` | 路由超时时间 |
| gateway.affinity | object | `{}` | 网关的节点亲和性 |
| gateway.annotations | object | `{}` | 应用于所有资源的注解 |
| gateway.autoscaling.enabled | bool | `false` | 启用网关的自动扩展功能 |
| gateway.autoscaling.maxReplicas | int | `5` | 最大副本数 |
| gateway.autoscaling.minReplicas | int | `1` | 最小副本数 |
| gateway.autoscaling.targetCPUUtilizationPercentage | int | `80` | CPU 使用率的目标百分比 |
| gateway.containerSecurityContext | string | `nil` | 网关容器的安全配置上下文 |
| gateway.env | object | `{}` | Pod 环境变量 |
| gateway.hostNetwork | bool | `false` | 是否使用主机网络 |
| gateway.httpPort | int | `80` | HTTP 服务端口 |
| gateway.httpsPort | int | `443` | HTTPS 服务端口 |
| gateway.hub | string | `"higress-registry.cn-hangzhou.cr.aliyuncs.com/higress"` | 网关镜像的基础域名 |
| gateway.image | string | `"gateway"` |  |
| gateway.kind | string | `"Deployment"` | 部署类型 |
| gateway.labels | object | `{}` | 应用于所有资源的标签 |
| gateway.metrics.enabled | bool | `false` | 启用网关度量收集 |
| gateway.metrics.honorLabels | bool | `false` | 是否合并现有标签 |
| gateway.metrics.interval | string | `""` | 度量间隔时间 |
| gateway.metrics.provider | string | `"monitoring.coreos.com"` | 定义监控提供者 |
| gateway.metrics.rawSpec | object | `{}` | 额外的度量规范 |
| gateway.metrics.relabelConfigs | list | `[]` | 重新标签配置 |
| gateway.metrics.relabelings | list | `[]` | 重新标签项 |
| gateway.metrics.scrapeTimeout | string | `""` | 抓取的超时时间 |
| gateway.name | string | `"higress-gateway"` | 网关名称 |
| gateway.networkGateway | string | `""` | 网络网关指定 |
| gateway.nodeSelector | object | `{}` | 节点选择器 |
| gateway.replicas | int | `2` | Higress Gateway pod 的数量 |
| gateway.resources.limits.cpu | string | `"2000m"` | 容器资源限制的 CPU |
| gateway.resources.limits.memory | string | `"2048Mi"` | 容器资源限制的内存 |
| gateway.resources.requests.cpu | string | `"2000m"` | 容器资源请求的 CPU |
| gateway.resources.requests.memory | string | `"2048Mi"` | 容器资源请求的内存 |
| gateway.revision | string | `""` | 网关所属版本声明 |
| gateway.rollingMaxSurge | string | `"100%"` | 最大激增数目百分比 |
| gateway.rollingMaxUnavailable | string | `"25%"` | 最大不可用比例 |
| gateway.readinessFailureThreshold | int | `30` | 成功尝试之前连续失败的最大探测次数 |
| gateway.readinessInitialDelaySeconds | int | `1` | 初次检测推迟多少秒后开始探测存活状态 |
| gateway.readinessPeriodSeconds | int | `2` | 存活探测间隔秒数 |
| gateway.readinessSuccessThreshold | int | `1` | 认为成功之前连续成功最小探测次数 |
| gateway.readinessTimeoutSeconds | int | `3` | 存活探测超时秒数 |
| gateway.securityContext | string | `nil` | 客户豆荚的安全上下文 |
| gateway.service.annotations | object | `{}` | 应用于服务账户的注释 |
| gateway.service.externalTrafficPolicy | string | `""` | 外部路由策略 |
| gateway.service.loadBalancerClass | string | `""` | 负载均衡器类别 |
| gateway.service.loadBalancerIP | string | `""` | 负载均衡器 IP 地址 |
| gateway.service.loadBalancerSourceRanges | list | `[]` | 允许访问负载均衡器的 CIDR 范围 |
| gateway.service.ports[0].name | string | `"http2"` | 服务定义的端口名称 |
| gateway.service.ports[0].port | int | `80` | 服务端口 |
| gateway.service.ports[0].protocol | string | `"TCP"` | 协议 |
| gateway.service.ports[0].targetPort | int | `80` | 靶向端口 |
| gateway.service.ports[1].name | string | `"https"` | 服务定义的端口名称 |
| gateway.service.ports[1].port | int | `443` | 服务端口 |
| gateway.service.ports[1].protocol | string | `"TCP"` | 协议 |
| gateway.service.ports[1].targetPort | int | `443` | 靶向端口 |
| gateway.service.type | string | `"LoadBalancer"` | 服务类型 |
| global.disableAlpnH2 | bool | `false` | 设置是否禁用 ALPN 中的 http/2 |
| ... | ... | ... | ... |

由于内容较多，其他参数可以参考完整表。
