# Devbox Controller 部署说明

## 📋 说明

`sealos run` 镜像时会在目标节点执行 Kubefile，本镜像通过 Helm 安装/升级 devbox controller。

Devbox Controller 提供两个版本：
- **v1alpha1**：基于 Deployment 部署，适用于普通场景
- **v2alpha2**（默认）：基于 DaemonSet 部署，需要节点级权限，适用于高级场景

---

## 🎯 版本对比

| 特性 | v1alpha1 | v2alpha2 (默认) |
|------|----------|-----------------|
| **部署类型** | Deployment | DaemonSet |
| **副本数** | 可配置（默认 2） | 每个标记节点一个 |
| **权限要求** | 普通权限 | Privileged（需要访问 containerd） |
| **节点选择** | 无限制 | 需要节点标签 `devbox.sealos.io/node=""` |
| **容器运行时访问** | ❌ | ✅ 可直接访问 containerd |
| **资源消耗** | 较低 | 较高（每节点一个 Pod） |
| **Leader Election** | ❌ 不支持 | ✅ 支持 |
| **推荐场景** | 测试、开发环境 | 生产环境 |

---

## 🚀 如何运行

### **v2alpha2 版本（默认）**

```bash
# 1. 最简配置（自动从集群 ConfigMap 读取 registry 配置）
sealos run ghcr.io/labring/sealos-devbox-controller:latest

# 2. 指定 registry 配置
sealos run ghcr.io/labring/sealos-devbox-controller:latest \
  --env registryAddr="sealos.hub:5000" \
  --env registryUser="admin" \
  --env registryPassword="yourpassword"

# 3. 完整配置示例
sealos run ghcr.io/labring/sealos-devbox-controller:latest \
  --env DEVBOX_VERSION="v2alpha2" \
  --env registryAddr="sealos.hub:5000" \
  --env registryUser="admin" \
  --env registryPassword="yourpassword" \
  --env RELEASE_NAMESPACE="devbox-system" \
  --env HELM_OPTS="--set resources.limits.cpu=2000m --set resources.limits.memory=3Gi"
```

**重要**：v2alpha2 版本需要给节点打标签：
```bash
kubectl label nodes <node-name> devbox.sealos.io/node=""
```

---

### **v1alpha1 版本（适用于测试环境）**

```bash
# 1. 最简配置
sealos run ghcr.io/labring/sealos-devbox-controller:v1alpha1 \
  --env DEVBOX_VERSION="v1alpha1"

# 2. 指定 registry 配置
sealos run ghcr.io/labring/sealos-devbox-controller:v1alpha1 \
  --env DEVBOX_VERSION="v1alpha1" \
  --env registryAddr="sealos.hub:5000" \
  --env registryUser="admin" \
  --env registryPassword="yourpassword"

# 3. 自定义副本数和资源
sealos run ghcr.io/labring/sealos-devbox-controller:v1alpha1 \
  --env DEVBOX_VERSION="v1alpha1" \
  --env registryAddr="sealos.hub:5000" \
  --env registryUser="admin" \
  --env registryPassword="yourpassword" \
  --env HELM_OPTS="--set replicaCount=3 --set resources.limits.memory=2Gi"
```

---

## 📦 环境变量说明

### **通用参数（v1 和 v2 都适用）**

| 变量名 | 说明 | 默认值 | 是否必填 |
|--------|------|--------|----------|
| `DEVBOX_VERSION` | 版本选择：`v1alpha1` 或 `v2alpha2` | `v2alpha2` | 否 |
| `registryAddr` | 镜像仓库地址 | 从 `sealos-config` ConfigMap 读取 | 否* |
| `registryUser` | 镜像仓库用户名 | 从 `sealos-config` ConfigMap 读取 | 否* |
| `registryPassword` | 镜像仓库密码 | 从 `sealos-config` ConfigMap 读取 | 否* |
| `RELEASE_NAME` | Helm release 名称 | `devbox` | 否 |
| `RELEASE_NAMESPACE` | Helm 安装命名空间 | `devbox-system` | 否 |
| `HELM_OPTS` | 透传给 Helm 的参数 | 空 | 否 |
| `CHART_PATH` | Helm chart 路径 | 自动选择 | 否 |
| `DEVBOX_BACKUP_ENABLED` | 是否启用备份 | `true` | 否 |
| `DEVBOX_BACKUP_DIR` | 备份目录 | `/tmp/sealos-backup/devbox-controller` | 否 |

> **注意**：如果集群中存在 `sealos-system/sealos-config` ConfigMap，registry 参数会自动读取，无需手动指定。

---

## 🔧 Helm Chart 可配置参数

### **v1alpha1 版本参数**

可通过 `HELM_OPTS` 传递以下参数：

```bash
# 部署相关
--set replicaCount=2                    # 副本数，默认 2
--set image=xxx:tag                     # 容器镜像
--set imagePullPolicy=IfNotPresent      # 镜像拉取策略

# Registry 配置
--set env.registryAddr="sealos.hub:5000"
--set env.registryUser="admin"
--set env.registryPassword="password"

# 资源配置
--set resources.limits.cpu=1500m
--set resources.limits.memory=2000Mi
--set resources.requests.cpu=100m
--set resources.requests.memory=640Mi

# 其他配置
--set nodeSelector."key"="value"        # 节点选择器
--set tolerations[0].key="key"          # 容忍度
--set affinity.nodeAffinity...          # 亲和性
```

**示例**：
```bash
sealos run ghcr.io/labring/sealos-devbox-controller:v1alpha1 \
  --env DEVBOX_VERSION="v1alpha1" \
  --env HELM_OPTS="\
    --set replicaCount=3 \
    --set resources.limits.cpu=2000m \
    --set resources.limits.memory=3Gi \
    --set hostAliases[0].ip=192.168.13.147 \
    --set hostAliases[0].hostnames[0]=sealos.hub"
```

---

### **v2alpha2 版本参数**

可通过 `HELM_OPTS` 传递以下参数：

```bash
# 镜像配置
--set image=xxx:tag                     # 容器镜像
--set imagePullPolicy=IfNotPresent      # 镜像拉取策略

# Registry 配置
--set env.registryAddr="sealos.hub:5000"
--set env.registryUser="admin"
--set env.registryPassword="password"
--set env.enableBlockIOResource=true    # 启用块 IO 资源配置

# 资源配置
--set resources.limits.cpu=1500m
--set resources.limits.memory=2000Mi
--set resources.requests.cpu=100m
--set resources.requests.memory=640Mi

# 节点选择和容忍度
--set nodeSelector."devbox\.sealos\.io/node"=""
--set tolerations[0].key="devbox.sealos.io/node"
--set tolerations[0].operator="Exists"
--set tolerations[0].effect="NoSchedule"

# 更新策略
--set updateStrategy.type=RollingUpdate
--set updateStrategy.rollingUpdate.maxUnavailable=1
```

**示例**：
```bash
sealos run ghcr.io/labring/sealos-devbox-controller:latest \
  --env DEVBOX_VERSION="v2alpha2" \
  --env HELM_OPTS="\
    --set resources.limits.cpu=2000m \
    --set resources.limits.memory=3Gi \
    --set env.enableBlockIOResource=true \
    --set updateStrategy.rollingUpdate.maxUnavailable=2"
```

---

## 🔍 默认配置读取规则

当未指定 `registryAddr`、`registryUser`、`registryPassword` 环境变量时，系统将自动从以下位置读取配置：

1. **Registry 配置**：从 `sealos-system` 命名空间下的 `sealos-config` ConfigMap 读取：
   - `registryAddr` ← `sealos-config.registryAddr`
   - `registryUser` ← `sealos-config.registryUser`
   - `registryPassword` ← `sealos-config.registryPassword`

2. 如果 ConfigMap 不存在或读取失败，将使用 values.yaml 中的默认值

---

## 🛠️ 使用 Helm 直接安装（不使用 Sealos）

### **v1alpha1 版本**

```bash
# 1. 进入 deploy 目录
cd controllers/devbox/deploy

# 2. 安装
helm install devbox ./charts/devbox-controller-v1alpha1 \
  -n devbox-system \
  --create-namespace \
  --set image=ghcr.io/labring/sealos-devbox-controller:v1alpha1 \
  --set env.registryAddr=sealos.hub:5000 \
  --set env.registryUser=admin \
  --set env.registryPassword=yourpassword

# 3. 升级
helm upgrade devbox ./charts/devbox-controller-v1alpha1 \
  -n devbox-system \
  --set image=ghcr.io/labring/sealos-devbox-controller:v1alpha1-new
```

---

### **v2alpha2 版本**

```bash
# 1. 进入 deploy 目录
cd controllers/devbox/deploy

# 2. 给节点打标签（重要！）
kubectl label nodes <node-name> devbox.sealos.io/node=""

# 3. 安装
helm install devbox ./charts/devbox-controller \
  -n devbox-system \
  --create-namespace \
  --set image=ghcr.io/labring/sealos-devbox-controller:latest \
  --set env.registryAddr=sealos.hub:5000 \
  --set env.registryUser=admin \
  --set env.registryPassword=yourpassword

# 4. 升级
helm upgrade devbox ./charts/devbox-controller \
  -n devbox-system \
  --set image=ghcr.io/labring/sealos-devbox-controller:latest-new
```

---

## 🐛 常见问题

### **1. v1alpha1 Pod CrashLoopBackOff：`NODE_NAME is not set`**

**问题**：v1alpha1 版本需要 NODE_NAME 环境变量。

**原因**：Chart 模板已包含此配置，如果出现此错误，请升级到最新的 Chart。

**解决**：
```bash
helm upgrade devbox ./charts/devbox-controller-v1alpha1 -n devbox-system --reuse-values
```

---

### **2. v2alpha2 DaemonSet 没有 Pod**

**问题**：DaemonSet 创建后没有 Pod 运行。

**原因**：节点没有打标签 `devbox.sealos.io/node=""`。

**解决**：
```bash
# 给节点打标签
kubectl label nodes <node-name> devbox.sealos.io/node=""

# 查看 DaemonSet 状态
kubectl get daemonset -n devbox-system devbox-controller-manager

# 查看节点标签
kubectl get nodes --show-labels | grep devbox
```

---

### **3. 资源已存在无法导入到 Helm**

**问题**：`Unable to continue with install: ... exists and cannot be imported`

**原因**：资源已存在但没有 Helm 管理标签。

**解决**：使用采纳脚本
```bash
cd controllers/devbox/deploy

# v1alpha1
DEVBOX_VERSION=v1alpha1 bash adopt-resources.sh

# v2alpha2
DEVBOX_VERSION=v2alpha2 bash adopt-resources.sh
```

---

### **4. 如何切换版本？**

从 v1alpha1 切换到 v2alpha2：
```bash
# 1. 卸载 v1
helm uninstall devbox -n devbox-system

# 2. 给节点打标签
kubectl label nodes <node-name> devbox.sealos.io/node=""

# 3. 安装 v2
helm install devbox ./charts/devbox-controller \
  -n devbox-system \
  --create-namespace
```

从 v2alpha2 切换到 v1alpha1：
```bash
# 1. 卸载 v2
helm uninstall devbox -n devbox-system

# 2. 移除节点标签（可选）
kubectl label nodes <node-name> devbox.sealos.io/node-

# 3. 安装 v1
helm install devbox ./charts/devbox-controller-v1alpha1 \
  -n devbox-system \
  --create-namespace
```

---

## 📚 更多信息

- **Chart 目录**：
  - v1alpha1: `./charts/devbox-controller-v1alpha1/`
  - v2alpha2: `./charts/devbox-controller/`
- **Entrypoint 脚本**：`./devbox-controller-entrypoint.sh`
- **Kubefile**：`./Kubefile`
- **采纳脚本**：`./adopt-resources.sh`

---

## 🎓 推荐部署方案

| 场景 | 推荐版本 | 原因 |
|------|----------|------|
| **生产环境** | v2alpha2 | 更强大的节点级控制，支持 containerd 直接访问 |
| **测试环境** | v1alpha1 | 部署简单，资源消耗低 |
| **开发环境** | v1alpha1 | 快速部署，易于调试 |
| **多节点集群** | v2alpha2 | 每节点独立控制，更灵活 |
| **单节点/小集群** | v1alpha1 | 无需节点标签，配置简单 |

---

## 📞 技术支持

如有问题，请查看：
1. Pod 日志：`kubectl logs -n devbox-system -l control-plane=controller-manager`
2. Pod 状态：`kubectl get pods -n devbox-system`
3. Helm Release：`helm list -n devbox-system`
4. Chart 配置：`helm get values devbox -n devbox-system`

