# resources-controller

## 说明
sealos run 镜像时会在目标节点执行 Kubefile，本镜像通过 Helm 安装/升级 resources controller。

## 必填参数

**无**（默认自动从集群 ConfigMap 读取 MongoDB 配置）

## 默认配置读取规则

当未指定 `MONGO_URI` 环境变量时，系统将按以下顺序自动读取配置：

1. **主数据库**：从 `sealos-system` 命名空间下的 `sealos-config` ConfigMap 读取 `databaseMongodbURI` 字段
2. **流量数据库**：从 `sealos-system` 命名空间下的 `nm-agent-config` ConfigMap 读取 `MONGO_URI` 字段，若不存在则使用主数据库配置

> 如需禁用自动配置，可设置 `RESOURCES_ENV_AUTO_CONFIG_ENABLED=false`

## 如何运行

```shell
# 最简配置（自动读取集群 ConfigMap 中的 MongoDB 配置）
sealos run ghcr.io/labring/sealos-cloud-resources-controller:latest
```

> 默认使用 mongodb 作为存储，sealos-resources 为数据库名

## 可选参数

- MONGO_URI: MongoDB 连接 URI（包含用户名和密码），若不指定则自动从 ConfigMap 读取
- TRAFFIC_MONGO_URI: 流量统计 MongoDB 连接 URI，默认与 MONGO_URI 相同
- RESOURCES_TRAFFICS_SERVICE_CONNECT_ADDRESS: 流量服务连接地址
- RELEASE_NAMESPACE: Helm 安装命名空间，默认 `resources-system`
- RELEASE_NAME: Helm release 名称，默认 `resources`
- HELM_OPTS: 透传 Helm 参数
- CHART_PATH: Helm chart 路径，默认 `./charts/resources-controller`
- RESOURCES_ENV_AUTO_CONFIG_ENABLED: 是否自动从 ConfigMap 读取配置，默认 `true`
- RESOURCES_BACKUP_ENABLED: 是否启用备份，默认 `true`

## 示例

```shell
# 1. 最简配置（使用集群默认 MongoDB）
sealos run ghcr.io/labring/sealos-cloud-resources-controller:latest

# 2. 指定自定义 MongoDB
sealos run ghcr.io/labring/sealos-cloud-resources-controller:latest \
  --env MONGO_URI="mongodb://user:pass@host:27017/resources?authSource=admin"

# 3. 自定义命名空间和流量 MongoDB
sealos run ghcr.io/labring/sealos-cloud-resources-controller:latest \
  --env MONGO_URI="mongodb://user:pass@mongo1:27017/resources?authSource=admin" \
  --env TRAFFIC_MONGO_URI="mongodb://user:pass@mongo2:27017/traffic?authSource=admin" \
  --env RELEASE_NAMESPACE="my-resources"

# 4. 使用 HELM_OPTS 自定义资源配置
sealos run ghcr.io/labring/sealos-cloud-resources-controller:latest \
  --env MONGO_URI="mongodb://user:pass@host:27017/resources?authSource=admin" \
  --env HELM_OPTS="--set resources.limits.cpu=2000m --set resources.limits.memory=2048Mi"

# 5. 完整配置示例
sealos run ghcr.io/labring/sealos-cloud-resources-controller:latest \
  --env MONGO_URI="mongodb://admin:password123@10.0.0.1:27017/resources?authSource=admin" \
  --env TRAFFIC_MONGO_URI="mongodb://admin:password123@10.0.0.1:27017/traffic?authSource=admin" \
  --env RELEASE_NAMESPACE="production" \
  --env RESOURCES_BACKUP_ENABLED="false" \
  --env HELM_OPTS="--set replicaCount=2"
```

## Helm Chart 可配置参数

可通过 `HELM_OPTS` 传递以下参数：

- `replicaCount`: 副本数，默认 `1`
- `image`: 容器镜像，默认 `ghcr.io/labring/sealos-resources-controller:latest`
- `imagePullPolicy`: 镜像拉取策略，默认 `Always`
- `secret.name`: Secret 名称，默认 `mongo-secret`
- `secret.mongoURI`: MongoDB 连接 URI
- `secret.trafficMongoURI`: 流量 MongoDB 连接 URI
- `secret.trafficsServiceConnectAddress`: 流量服务连接地址
- `metrics.enabled`: 是否启用 metrics，默认 `false`
- `resources.limits.cpu/memory`: CPU/内存限制
- `resources.requests.cpu/memory`: CPU/内存请求
- `nodeSelector`: 节点选择器
- `tolerations`: 容忍度配置
- `affinity`: 亲和性配置
