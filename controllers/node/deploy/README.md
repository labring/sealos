# Node Controller Helm Chart

Node Controller 的 Helm Chart 部署配置。

## 快速开始

### 最精简配置

使用默认配置直接启动：

```bash
sealos run node-controller:latest
```

### 自定义配置示例

```bash
# 通过 HELM_OPTS 传入自定义配置
sealos run node-controller:latest \
  --env HELM_OPTS="--set replicaCount=2 --set resources.limits.cpu=1000m"
```

## 配置说明

### 镜像和资源配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `image` | `ghcr.io/labring/sealos-node-controller:latest` | 镜像地址 |
| `imagePullPolicy` | `Always` | 镜像拉取策略 |
| `replicaCount` | `1` | 副本数 |

### 资源限制

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `resources.limits.cpu` | `500m` | CPU 限制 |
| `resources.limits.memory` | `128Mi` | 内存限制 |
| `resources.requests.cpu` | `10m` | CPU 请求 |
| `resources.requests.memory` | `64Mi` | 内存请求 |

### Metrics 配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `metrics.enabled` | `false` | 是否启用 metrics endpoint |
| `metrics.certPath` | `/tmp/k8s-metrics-server/metrics-certs` | Metrics 证书路径 |
| `metrics.secretName` | `metrics-server-cert` | Metrics 证书 Secret 名称 |

**注意**: Metrics 默认关闭。如需启用,请确保在代码中也进行相应配置,否则无法启动。

### GPU 别名配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `gpuAlias` | `[{"name": "Tesla-P41", "value": "Tesla-P41"}]` | GPU 型号别名配置 |

## 使用示例

### 示例 1：修改副本数和资源限制

```bash
sealos run node-controller:latest \
  --env HELM_OPTS="--set replicaCount=2 --set resources.limits.cpu=1000m --set resources.limits.memory=256Mi"
```

### 示例 2：启用 Metrics

```bash
sealos run node-controller:latest \
  --env HELM_OPTS="--set metrics.enabled=true"
```

### 示例 3：自定义 GPU 别名

```bash
sealos run node-controller:latest \
  --env HELM_OPTS='--set gpuAlias[0].name=Tesla-V100 --set gpuAlias[0].value=NVIDIA-Tesla-V100-PCIE-16GB'
```

### 示例 4：设置节点选择器和容忍度

```bash
sealos run node-controller:latest \
  --env HELM_OPTS="--set nodeSelector.node-role.kubernetes.io/master= --set tolerations[0].key=node-role.kubernetes.io/master --set tolerations[0].effect=NoSchedule"
```

## 环境变量

### 脚本环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RELEASE_NAME` | `node-controller` | Helm Release 名称 |
| `RELEASE_NAMESPACE` | `node-system` | 命名空间 |
| `CHART_PATH` | `./charts/node-controller` | Chart 路径 |

## 部署架构

Node Controller 采用标准的 Kubernetes 部署架构：

- **Deployment**: 管理控制器副本
- **ServiceAccount**: 用于 RBAC 权限管理
- **RBAC**: 包含 ClusterRole、ClusterRoleBinding、Role 和 RoleBinding
- **ConfigMap**: 存储 GPU 别名配置和 GPU 信息
- **Service**: 当启用 metrics 时暴露 metrics endpoint
- **Certificate**: 使用 cert-manager 管理的 TLS 证书

## RBAC 权限

Node Controller 需要以下权限：

- **ConfigMaps**: 创建、删除、获取、列表、更新、监控
- **Nodes**: 创建、删除、获取、列表、更新、监控（包括 status）
- **Pods**: 创建、删除、获取、列表、更新、监控
- **GPUs (node.k8s.io)**: 完整的 CRUD 权限（包括 finalizers 和 status）

## 注意事项

1. **命名空间管理**: 命名空间通过 Helm 安装时自动创建（`--create-namespace`）
2. **资源托管**: 脚本会自动将现有的 Kubernetes 资源托管给 Helm（添加 managed-by label）
3. **Metrics**: 默认关闭以减少资源消耗。如需启用,请确保代码支持
4. **GPU 支持**: Controller 会监控和管理 GPU 资源
5. **安全性**: 默认启用 Pod 安全上下文（runAsNonRoot、readOnlyRootFilesystem 等）

## 配置优先级

配置参数的优先级从高到低为：

1. 用户通过 `--env HELM_OPTS` 传入的参数（最高优先级）
2. Chart values.yaml 中的默认值（最低优先级）

## 故障排查

### 检查部署状态

```bash
# 查看 Helm Release 状态
helm status node-controller -n node-system

# 查看 Pod 状态
kubectl get pods -n node-system

# 查看 Pod 日志
kubectl logs -n node-system -l control-plane=controller-manager --tail=100
```

### 常见问题

1. **Pod 无法启动**: 检查资源限制是否满足,查看 `kubectl describe pod`
2. **GPU 识别问题**: 确认节点已正确安装 GPU 驱动和设备插件
3. **Metrics 无法访问**: 确认已启用 `metrics.enabled` 且代码已支持
