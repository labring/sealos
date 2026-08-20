# account-service

## 说明
sealos run 镜像时会在目标节点执行 Kubefile，本镜像通过 Helm 安装/升级 account-service Deployment。

## 必填参数

**无**

## 如何运行

```shell
# 最简配置
sealos run labring/account-service:latest

# 自定义命名空间
sealos run labring/account-service:latest \
  --env RELEASE_NAMESPACE=my-account-system

# 自定义镜像
sealos run labring/account-service:latest \
  --env HELM_OPTS="--set image=ghcr.io/labring/sealos-account-service:v1.0.0"

# 自定义副本数
sealos run labring/account-service:latest \
  --env HELM_OPTS="--set replicaCount=3"
```

## 可选参数

- RELEASE_NAMESPACE: Helm 安装命名空间，默认 `account-system`
- RELEASE_NAME: Helm release 名称，默认 `account-service`
- HELM_OPTS: 透传 Helm 参数（例如 `--set replicaCount=3 --set image.tag=latest`）
- CHART_PATH: Helm chart 路径，默认 `./charts/account-service`

## Helm Chart 可配置参数

可通过 `HELM_OPTS` 传递以下参数：

### 基础配置

- `replicaCount`: 副本数，默认 `1`
- `image`: 容器镜像，默认 `ghcr.io/labring/sealos-account-service:latest`
- `imagePullPolicy`: 镜像拉取策略，默认 `Always`
- `imagePullSecrets`: 镜像拉取密钥，默认 `[]`

### 服务配置

- `service.type`: 服务类型，默认 `ClusterIP`
- `service.port`: 服务端口，默认 `2333`

### 资源配置

- `resources.limits.cpu`: CPU 限制，默认 `500m`
- `resources.limits.memory`: 内存限制，默认 `256Mi`
- `resources.requests.cpu`: CPU 请求，默认 `50m`
- `resources.requests.memory`: 内存请求，默认 `25Mi`

### 健康检查

- `livenessProbe.httpGet.path`: 存活探针路径，默认 `/health`
- `livenessProbe.httpGet.port`: 存活探针端口，默认 `2333`
- `livenessProbe.initialDelaySeconds`: 存活探针初始延迟，默认 `3`
- `livenessProbe.periodSeconds`: 存活探针周期，默认 `10`
- `readinessProbe.httpGet.path`: 就绪探针路径，默认 `/health`
- `readinessProbe.httpGet.port`: 就绪探针端口，默认 `2333`
- `readinessProbe.initialDelaySeconds`: 就绪探针初始延迟，默认 `3`
- `readinessProbe.periodSeconds`: 就绪探针周期，默认 `5`
- `readinessProbe.failureThreshold`: 就绪探针失败阈值，默认 `6`

### 调度配置

- `nodeSelector`: 节点选择器，默认 `{}`
- `tolerations`: 容忍度配置，默认 `[]`
- `affinity`: 亲和性配置，默认 `{}`

### 自动伸缩

- `autoscaling.enabled`: 是否启用自动伸缩，默认 `false`
- `autoscaling.minReplicas`: 最小副本数，默认 `1`
- `autoscaling.maxReplicas`: 最大副本数，默认 `1`
- `autoscaling.targetCPUUtilizationPercentage`: 目标 CPU 利用率，默认 `80`

### 其他配置

- `serviceAccountName`: 服务账户名称，默认 `account-controller-manager`
- `envConfigMapName`: 环境 ConfigMap 名称，默认 `account-manager-env`
- `paymentSecretName`: 支付密钥名称，默认 `payment-secret`
- `regionInfoConfigMapName`: 区域信息 ConfigMap 名称，默认 `region-info`
- `nameOverride`: 名称覆盖，默认 `""`
- `fullnameOverride`: 完全限定名称覆盖，默认 `account-service`

## 示例

```shell
# 1. 最简配置
sealos run labring/account-service:latest

# 2. 自定义命名空间
sealos run labring/account-service:latest \
  --env RELEASE_NAMESPACE=my-account-system

# 3. 自定义镜像和标签
sealos run labring/account-service:latest \
  --env HELM_OPTS="--set image=ghcr.io/labring/sealos-account-service:v1.0.0"

# 4. 自定义副本数和资源限制
sealos run labring/account-service:latest \
  --env HELM_OPTS="--set replicaCount=3 --set resources.limits.cpu=1000m --set resources.limits.memory=512Mi"

# 5. 自定义服务端口
sealos run labring/account-service:latest \
  --env HELM_OPTS="--set service.port=8080"

# 6. 配置节点选择器
sealos run labring/account-service:latest \
  --env HELM_OPTS="--set nodeSelector.node-role.kubernetes.io/worker="

# 7. 启用自动伸缩
sealos run labring/account-service:latest \
  --env HELM_OPTS="--set autoscaling.enabled=true --set autoscaling.minReplicas=2 --set autoscaling.maxReplicas=5"

# 8. 完整配置示例
sealos run labring/account-service:latest \
  --env RELEASE_NAMESPACE=production-account \
  --env HELM_OPTS="--set replicaCount=3 \
    --set image=ghcr.io/labring/sealos-account-service:v1.0.0 \
    --set resources.limits.cpu=1000m \
    --set resources.limits.memory=512Mi \
    --set resources.requests.cpu=100m \
    --set resources.requests.memory=50Mi \
    --set livenessProbe.initialDelaySeconds=10 \
    --set readinessProbe.initialDelaySeconds=10"
```

## 架构说明

### 组件说明

- **Deployment**: account-service 的无状态应用部署
- **Service**: 提供集群内部服务发现
- **ConfigMap**: 存储配置信息（region-info、account-manager-env）
- **Secret**: 存储敏感信息（payment-secret）

### 服务账户

使用现有的 `account-controller-manager` service account，与 account-controller 共享权限。

### 依赖组件

- **account-controller**: 提供 account-manager-env ConfigMap 和 service account
- **payment-secret**: 支付配置密钥（可选）

## 部署流程

1. **Adopt 现有资源**: 如果是从旧版本 manifest 部署迁移，会将现有资源标记为 Helm 管理
2. **创建命名空间**: 如果命名空间不存在，Helm 会自动创建（通过 `--create-namespace` 参数）
3. **安装/升级 Helm Release**: 使用 Helm chart 部署或更新应用

## 故障排查

### 检查 Pod 状态

```shell
kubectl get pods -n account-system
kubectl describe pod -n account-system -l app=account-service
```

### 查看日志

```shell
kubectl logs -n account-system deployment/account-service
kubectl logs -n account-system deployment/account-service --tail=100 -f
```

### 检查 Helm Release

```shell
helm status account-service -n account-system
helm get all account-service -n account-system
```

### 检查配置

```shell
# 查看 ConfigMap
kubectl get configmap account-manager-env -n account-system -o yaml
kubectl get configmap region-info -n account-system -o yaml

# 查看 Secret
kubectl get secret payment-secret -n account-system -o yaml
```

### 重启服务

```shell
kubectl rollout restart deployment/account-service -n account-system
```

### 卸载

```shell
helm uninstall account-service -n account-system
```

## 从旧版本迁移

如果之前使用 manifest 部署（`manifests/deploy.yaml`），entrypoint 脚本会自动：

1. Adopt 现有的 Deployment、Service、ConfigMap 资源
2. 为资源添加 Helm 管理标签
3. 使用 Helm 接管这些资源

无需手动删除旧资源，直接运行新的 sealos run 命令即可。

## 与 account-controller 的区别

| 特性 | account-service | account-controller |
|------|-----------------|-------------------|
| 类型 | 无状态服务（HTTP API） | Kubernetes 控制器 |
| Webhook | 无 | 有（validating webhook） |
| RBAC | 复用 controller 的 SA | 独立的完整 RBAC |
| Metrics | 无 | 有（可选启用） |
| Certificates | 无 | 需要 cert-manager 证书 |
| 功能 | 提供 Account API 服务 | 管理 Account CRD 和计费逻辑 |

## 开发指南

### 本地测试

```shell
# 模板渲染测试
helm template account-service ./charts/account-service

# 干跑安装
helm install account-service ./charts/account-service --dry-run --debug

# Lint 检查
helm lint ./charts/account-service
```

### 构建镜像

```shell
# 在 deploy 目录下执行
cd service/account/deploy
sealos build -t labring/account-service:latest .
```

### 本地运行测试

```shell
# 直接运行 entrypoint 脚本（需要 kubectl 访问权限）
bash account-service-entrypoint.sh
```

## 贡献指南

修改 Chart 时请注意：

1. 更新 `Chart.yaml` 中的版本号
2. 在 README.md 中记录新增的配置参数
3. 使用 `helm template` 和 `helm lint` 验证模板
4. 测试升级流程：从旧版本升级到新版本
