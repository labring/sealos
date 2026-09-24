# Account Controller Helm Chart

Account Controller 的 Helm Chart 部署配置。

## 应用和数据库创建人记录

资源创建人准入 webhook 在用户命名空间内，为 AppLaunchpad 主工作负载、KubeBlocks Cluster、Devbox、ObjectStorageBucket 和 CronJob 写入以下 annotations：

- `resource.sealos.io/creator-user-cr-name`：从已认证身份提取的区域用户标识（如 `2kvpbpql`），不是桌面短 ID；非用户主体不写入。
- `resource.sealos.io/creator-type`：`user`、`service` 或 `unknown`。

创建人 webhook 不查询数据库；只记录请求身份，User.id 映射由独立 admin 应用的查询接口处理，不新增表。更新保留原记录，历史资源不因编辑补写创建人。Deployment/StatefulSet 转换在旧主资源仍存在时继承原记录；删除后重建重新记录。后台服务使用自身凭据创建时记录服务身份，不推测发起账号。

部署需要同时更新控制器镜像与 webhook 配置，并保持 `DISABLE_WEBHOOKS` 未启用。创建人 webhook 使用 `failurePolicy: Fail`：服务不可达时，匹配命名空间内的 Deployment、StatefulSet、数据库 Cluster、Devbox、ObjectStorageBucket 和 CronJob 创建/更新会被阻止；创建人处理不依赖账号映射数据库，但应用类型转换仍需读取 Kubernetes 中的原工作负载。升级应先确保新控制器端点与证书可用，再启用新 webhook；回退旧镜像前需移除这两条配置，停用期间无法保证创建人记录完整。

本仓库此次仅提供创建人 webhook。创建账号、按账号查询资源、按命名空间查询资源由独立 admin 应用实现；不在 account-service 或子应用列表、详情接口增加创建人查询字段。匹配范围为带 `user.sealos.io/owner` 标签且名称以 `ns-` 开头的命名空间，应用需带 `cloud.sealos.io/app-deploy-manager` 标签，数据库支持 `apps.kubeblocks.io/v1alpha1` 与 `v1` 的顶层 Cluster。

应用管理同时保护 `metadata.annotations` 和 `spec.template.metadata.annotations` 的两个创建人字段；Pod 从模板继承，单独用于 Pod 统计，不计为独立业务。已有顶层记录的应用后续更新时会把原创建人同步到模板，这可能触发滚动更新；完全无记录的历史应用不推测创建人，已有 Pod 不批量回填。其他业务只写顶层，CronJob 的 jobTemplate 等嵌套模板不写入。Service、Ingress、PVC、ConfigMap、Secret、Job 等附属资源不注入。

新增支持 `devbox.sealos.io/v1alpha2` Devbox、`objectstorage.sealos.io/v1` ObjectStorageBucket、`batch/v1` CronJob；不把对象存储账号 ObjectStorageUser 当成桶，不对控制器派生资源重复注入。镜像服务尚未确认可标注的顶层资源，不在本 webhook 的覆盖范围；各类型的 admin 查询适配需单独交付。

## 快速开始

### 最精简配置

使用默认配置直接启动：

```bash
sealos run account-controller:latest
```

### 自定义配置示例

```bash
# 通过 HELM_OPTS 传入自定义配置
sealos run account-controller:latest \
  --env HELM_OPTS="--set-string accountEnv.cloudDomain=cloud.sealos.io --set-string accountEnv.mongoURI=mongodb://mongo:27017/resources"
```

## 配置说明

### 自动配置（从 ConfigMap 和 Secret 获取）

以下配置会自动从 `sealos-system/sealos-config` ConfigMap 中读取（如果存在）：

- `cloudDomain` - 云平台域名
- `cloudPort` - 云平台端口
- `accountApiJwtSecret` - JWT 密钥
- `accountAdminJwtSecret` - admin API 专用 JWT 密钥，由脚本从 `account-admin-jwt` Secret 读取，不存在时自动生成
- `localRegion` - 本地区域 UID
- `globalCockroachURI` - 全局 CockroachDB URI
- `localCockroachURI` - 本地 CockroachDB URI
- `mongoURI` - MongoDB URI
- `trafficMongoURI` - 流量 MongoDB URI（从 `sealos-system/nm-agent-config` 获取，不存在则使用 mongoURI）

**注意**：通过 `--env HELM_OPTS` 传入的相同参数会覆盖从 ConfigMap 获取的值。

### 通过 HELM_OPTS 支持的配置项

#### 基础配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `accountEnvMergeStrategy` | `overwrite` | ConfigMap 合并策略：`preserve`(保留旧值) 或 `overwrite`(覆盖旧值) |

#### 环境变量配置 (accountEnv.*)

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `accountEnv.cloudDomain` | `cloud.sealos.io` | 云平台域名 |
| `accountEnv.cloudPort` | - | 云平台端口 |
| `accountEnv.accountApiJwtSecret` | `secret` | JWT 密钥 |
| `accountEnv.accountAdminJwtSecret` | - | admin API 专用 JWT 密钥 |
| `accountEnv.localRegion` | - | 本地区域 UID |
| `accountEnv.globalCockroachURI` | - | 全局 CockroachDB URI |
| `accountEnv.localCockroachURI` | - | 本地 CockroachDB URI |
| `accountEnv.mongoURI` | `mongodb://mongo:27017/resources` | MongoDB URI |
| `accountEnv.trafficMongoURI` | - | 流量 MongoDB URI |
| `accountEnv.whitelistKubernetesHosts` | - | Kubernetes API Server 白名单（自动根据 cloudDomain 生成） |

#### 存储配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `accountEnv.osAdminSecret` | - | 对象存储管理员 Secret 名称 |
| `accountEnv.osInternalEndpoint` | `object-storage.objectstorage-system.svc` | 对象存储内部端点 |
| `accountEnv.osNamespace` | `objectstorage-system` | 对象存储命名空间 |

#### 配额限制

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `accountEnv.quotaLimitsCpu` | `16` | CPU 限制 |
| `accountEnv.quotaLimitsMemory` | `64Gi` | 内存限制 |
| `accountEnv.quotaLimitsStorage` | `200Gi` | 存储限制 |
| `accountEnv.quotaLimitsGpu` | `8` | GPU 限制 |
| `accountEnv.quotaLimitsPods` | `20` | Pod 数量限制 |
| `accountEnv.quotaLimitsNodePorts` | `10` | NodePort 数量限制 |
| `accountEnv.quotaObjectStorageSize` | `20Gi` | 对象存储大小限制 |
| `accountEnv.quotaObjectStorageBucket` | `20` | 对象存储 Bucket 数量限制 |
| `accountEnv.limitRangeEphemeralStorage` | `0` | 临时存储限制 |

#### 账户配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `accountEnv.baseBalance` | `5000000` | 基础余额 |
| `accountEnv.approachingDeletionPeriod` | `345600` | 接近删除周期（秒） |
| `accountEnv.imminentDeletionPeriod` | `259200` | 即将删除周期（秒） |
| `accountEnv.finalDeletionPeriod` | `604800` | 最终删除周期（秒） |
| `accountEnv.debtDetectionCycleSeconds` | `1800` | 债务检测周期（秒） |

#### 镜像和资源配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `image` | `ghcr.io/labring/sealos-account-controller:latest` | 镜像地址 |
| `imagePullPolicy` | `Always` | 镜像拉取策略 |
| `replicaCount` | `1` | 副本数 |

#### 资源限制

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `resources.limits.cpu` | `1000m` | CPU 限制 |
| `resources.limits.memory` | `1024Mi` | 内存限制 |
| `resources.requests.cpu` | `100m` | CPU 请求 |
| `resources.requests.memory` | `64Mi` | 内存请求 |

## 使用示例

### 示例 1：修改数据库连接

```bash
sealos run account-controller:latest \
  --env HELM_OPTS="--set-string accountEnv.mongoURI=mongodb://custom-mongo:27017/resources --set-string accountEnv.globalCockroachURI=postgres://cockroach:26257/db"
```

### 示例 2：自定义配额限制

```bash
sealos run account-controller:latest \
  --env HELM_OPTS="--set-string accountEnv.quotaLimitsCpu=32 --set-string accountEnv.quotaLimitsMemory=128Gi --set-string accountEnv.quotaLimitsStorage=500Gi"
```

### 示例 3：启用奖励处理并调整对象存储配置

```bash
sealos run account-controller:latest \
  --env HELM_OPTS="--set-string accountEnv.rewardProcessing=true --set-string accountEnv.osAdminSecret=my-admin-secret --set-string accountEnv.osNamespace=my-objectstorage"
```

### 示例 4：修改资源限制

```bash
sealos run account-controller:latest \
  --env HELM_OPTS="--set resources.limits.cpu=2000m --set resources.limits.memory=2048Mi --set replicaCount=2"
```

### 示例 5：设置 ConfigMap 合并策略为保留旧值

```bash
sealos run account-controller:latest \
  --env ACCOUNT_ENV_MERGE_STRATEGY=preserve
```

## 环境变量

### 脚本环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RELEASE_NAME` | `account-controller` | Helm Release 名称 |
| `RELEASE_NAMESPACE` | `account-system` | 命名空间 |
| `CHART_PATH` | `./charts/account-controller` | Chart 路径 |
| `ACCOUNT_ENV_MERGE_STRATEGY` | `overwrite` | ConfigMap 合并策略 |
| `ACCOUNT_BACKUP_ENABLED` | `true` | 是否启用升级前备份 |
| `ACCOUNT_BACKUP_DIR` | `/tmp/sealos-backup/account-controller` | 备份目录 |

## 备份机制

升级前会自动备份以下资源到 `/tmp/sealos-backup/account-controller/`：

- CRD 资源（accounts、debts、payments）
- RBAC 资源（ClusterRole、ClusterRoleBinding）
- Namespace 资源
- 命名空间内资源（ConfigMap、Secret、Service、Deployment、ServiceAccount、Role、RoleBinding、Issuer、Certificate）

如需禁用备份：

```bash
sealos run account-controller:latest --env ACCOUNT_BACKUP_ENABLED=false
```

## 配置优先级

配置参数的优先级从高到低为：

1. 用户通过 `--env HELM_OPTS` 传入的参数（最高优先级）
2. 脚本内部从 ConfigMap 自动获取的配置
3. Chart values.yaml 中的默认值（最低优先级）

## 注意事项

1. **自动配置**：脚本会自动从 `sealos-system/sealos-config` ConfigMap 读取基础配置，无需手动传入
2. **配置覆盖**：通过 `HELM_OPTS` 传入的参数会覆盖自动获取的配置和默认值
3. **Secret 安全**：生产环境请妥善保护 `accountEnv.accountApiJwtSecret` 和 `accountEnv.accountAdminJwtSecret`，两者用途不同
4. **持久化存储**：确保 MongoDB 和 CockroachDB 的连接配置正确
