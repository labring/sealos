# job-init

## 说明
sealos run 镜像时会在目标节点执行 Kubefile，本镜像通过 Helm 安装/升级 job-init Job。

## 必填参数

**无**（但建议至少配置 `PASSWORD_SALT` 以增强安全性）

## 如何运行

```shell
# 最简配置（使用默认管理员账号）
# 建议配置（设置密码盐值）
sealos run ghcr.io/labring/sealos-job-init-controller:latest \
  --env PASSWORD_SALT="your-random-salt-string"
```

## 可选参数

- PASSWORD_SALT: 密码盐值（建议传入以增强安全性）
- ADMIN_PASSWORD: 管理员密码，默认 `sealos2023`
- ADMIN_USER_NAME: 管理员用户名，默认 `admin`
- WORKSPACE_PREFIX: 工作空间前缀，默认 `ns-`
- DEFAULT_NAMESPACE / RELEASE_NAMESPACE: Helm 安装命名空间，默认 `account-system`
- RELEASE_NAME: Helm release 名称，默认 `job-init`
- JOB_NAME: Job 资源名，默认 `init-job`（若改动 fullnameOverride 需同步）
- ENV_FROM_CONFIGMAP: Job envFrom 的 ConfigMap 名称，默认 `account-manager-env`
- JOB_INIT_SERVICE_ACCOUNT: Job 使用的 ServiceAccount 名称，默认 `account-controller-manager`
- HELM_OPTS: 透传 Helm 参数（例如 `--set ttlSecondsAfterFinished=3600`）
- CHART_PATH: Helm chart 路径，默认 `./charts/job-init`

## 示例

```shell
# 1. 最简配置（使用默认管理员账号 admin/sealos2023）
sealos run ghcr.io/labring/sealos-job-init-controller:latest

# 2. 建议配置（设置密码盐值）
sealos run ghcr.io/labring/sealos-job-init-controller:latest \
  --env PASSWORD_SALT="your-random-salt-string"

# 3. 自定义管理员账号
sealos run ghcr.io/labring/sealos-job-init-controller:latest \
  --env PASSWORD_SALT="your-salt" \
  --env ADMIN_PASSWORD="MyStrongPassword123" \
  --env ADMIN_USER_NAME="admin"

# 4. 自定义命名空间和工作空间前缀
sealos run ghcr.io/labring/sealos-job-init-controller:latest \
  --env PASSWORD_SALT="your-salt" \
  --env DEFAULT_NAMESPACE="my-account-system" \
  --env WORKSPACE_PREFIX="workspace-"

# 5. 使用 HELM_OPTS 自定义 Job 配置
sealos run ghcr.io/labring/sealos-job-init-controller:latest \
  --env PASSWORD_SALT="your-salt" \
  --env HELM_OPTS="--set ttlSecondsAfterFinished=3600 --set backoffLimit=2"

# 6. 完整配置示例
sealos run ghcr.io/labring/sealos-job-init-controller:latest \
  --env PASSWORD_SALT="my-secure-random-salt-12345" \
  --env ADMIN_PASSWORD="Admin@2024" \
  --env ADMIN_USER_NAME="admin" \
  --env WORKSPACE_PREFIX="user-" \
  --env DEFAULT_NAMESPACE="production-account" \
  --env HELM_OPTS="--set ttlSecondsAfterFinished=7200"
```

## Helm Chart 可配置参数

可通过 `HELM_OPTS` 传递以下参数：

- `ttlSecondsAfterFinished`: Job 完成后的保留时间（秒）
- `backoffLimit`: Job 重试次数，默认值由 Chart 定义
- `image`: 容器镜像
- `resources.limits.cpu/memory`: CPU/内存限制
- `resources.requests.cpu/memory`: CPU/内存请求
- `nodeSelector`: 节点选择器
- `tolerations`: 容忍度配置
- `affinity`: 亲和性配置
