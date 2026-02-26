# Sealos 横向配置职责分层（ConfigMap 与 globals）

## 0. 结论先行

你当前思路可以明确拆成两条线：

1. `ConfigMap`：解决 `entrypoint.sh` 的运行时读取与自动注入问题。
2. `globals.yaml`：解决 Helm values 的横向聚合与统一开关问题。

这两条线不是替代关系，而是分层关系：
- `globals.yaml` 负责“声明式聚合”。
- `ConfigMap` 负责“运行时注入/发现”。

## 1. 问题定义

当前配置存在两个不同维度的问题：

1. 运行时注入维度：不同模块的 `entrypoint.sh` 需要从统一位置拿到基础参数（如 `sealos-config`）。
2. 配置聚合维度：多个模块共享同一批 feature 开关时，缺少统一 values 聚合入口。

## 2. 职责分层模型

### 2.1 ConfigMap 层（Runtime Injection Layer）

目标：服务 `entrypoint.sh`，保障模块安装/升级时能自动读取运行环境参数。

典型方式：
1. `entrypoint.sh` 通过 `kubectl get configmap` 读取参数。
2. 将读取结果转为 Helm `--set-string` 或环境变量。
3. 在模块 chart 渲染时完成注入。

典型配置源（当前已使用）：
- `sealos-config`：平台基础参数（domain/port/region/db/jwt/salt）
- `cert-config`：证书模式
- `nm-agent-config`：流量 Mongo 入口
- `objectstorage-config`：对象存储账号入口
- `sealos-cloud-admin`：初始化管理员密码存储

### 2.2 globals 层（Helm Values Aggregation Layer）

目标：聚合横向 feature 配置，统一多模块开关与默认参数。

典型方式：
1. 维护 `/root/.sealos/cloud/values/globals.yaml`。
2. 安装脚本通过 `yq` 解析 `globals.yaml`。
3. 将结果与模块 values 合并后传给 Helm。

## 3. 你当前内容总结

### 3.1 关键设计点

1. 引入统一 `globals` 文件承载横向 feature。
2. feature 开关与参数分离：`feature_gates` + `feature_configs`。
3. 首批 feature：`gpu_hami`、`online_ide`、`import_ide`、`gitea_template`、`nfs`。

### 3.2 路径约定（你补充的方向）

1. 全局配置：`/root/.sealos/cloud/values/globals.yaml`
2. 模块覆盖：`/root/.sealos/cloud/values/core/<module>-values.yaml`
3. 应用级扩展：`/root/.sealos/cloud/values/apps/devbox/xxx.yaml`

### 3.3 现阶段待处理关注点

1. SA 依赖和 ENV 依赖需要拆开治理（避免耦合在同一个聚合块）。
2. `sealos-config` 用法需要形成统一约定（字段、覆盖关系、回退逻辑）。
3. 安装脚本需显式依赖 `yq`，用于解析 `globals.yaml`。
4. Chart 命名/路径需要规范化，避免多种命名并存带来的维护成本。

## 4. `globals.yaml` 草案（第一版）

```yaml
globals:
  version: v1alpha1

  feature_gates:
    gpu_hami: false
    online_ide: true
    import_ide: false
    gitea_template: false
    nfs: false

  feature_configs:
    gpu_hami:
      webui_config_map: hami-webui-config
      namespace: sealos-system

    online_ide:
      startup_config_map: devbox-startup
      registry_config_map: devbox-config
      namespace: sealos-system

    import_ide:
      enabled_sources: ["git", "tar", "registry"]
      max_package_size_mb: 2048

    gitea_template:
      endpoint: ""
      org: "templates"
      repo: "sealos-templates"
      branch: "main"

    nfs:
      storage_class: "nfs-client"
      provisioner: ""
      mount_options: []
```

## 5. 模块读取顺序与优先级（统一口径）

### 5.1 加载顺序（执行顺序，前低后高）

1. `charts/<module>/values.yaml`
2. `/root/.sealos/cloud/values/globals.yaml`
3. `/root/.sealos/cloud/values/apps/<module>/*-values.yaml`（可选）
4. `/root/.sealos/cloud/values/core/<module>-values.yaml`

### 5.2 生效优先级（高到低）

1. `HELM_OPTIONS/--set/--set-string`
2. `/root/.sealos/cloud/values/core/<module>-values.yaml`
3. `/root/.sealos/cloud/values/apps/<module>/*-values.yaml`
4. `/root/.sealos/cloud/values/globals.yaml`
5. `charts/<module>/values.yaml`

### 5.3 Feature 判定规则

1. 先判定 `globals.feature_gates.<feature>`。
2. 当值为 `false` 时，忽略该 feature 的 `feature_configs` 与模块私有同名开关。
3. 当值为 `true` 时，再读取该 feature 配置并合并到模块 values。

### 5.4 脚本示例

示例 A：`entrypoint.sh` 从 `sealos-config` 读取基础变量

```bash
varCloudDomain=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}')
varCloudPort=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudPort}')
varRegionUID=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.regionUID}')
varDatabaseGlobalCockroachdbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseGlobalCockroachdbURI}')
varDatabaseLocalCockroachdbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseLocalCockroachdbURI}')
varDatabaseMongodbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseMongodbURI}')
varPasswordSalt=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.passwordSalt}')
varJwtInternal=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtInternal}')
varJwtRegional=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtRegional}')
varJwtGlobal=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtGlobal}')
```

示例 B：使用 `yq` 读取 `globals` 参数（`yq` 路径：`~/.sealos/cloud/bin/yq`）

```bash
YQ_BIN="${HOME}/.sealos/cloud/bin/yq"
GLOBALS_FILE="/root/.sealos/cloud/values/globals.yaml"

# 读取开关：globals.feature_gates.gpu_hami
gpuHamiEnabled=$("${YQ_BIN}" e -r '.globals.feature_gates.gpu_hami // false' "${GLOBALS_FILE}")

# 读取参数：globals.feature_configs.nfs.storage_class
nfsStorageClass=$("${YQ_BIN}" e -r '.globals.feature_configs.nfs.storage_class // "nfs-client"' "${GLOBALS_FILE}")

# 读取参数：globals.feature_configs.online_ide.startup_config_map
onlineIDEStartupCM=$("${YQ_BIN}" e -r '.globals.feature_configs.online_ide.startup_config_map // "devbox-startup"' "${GLOBALS_FILE}")
```

## 6. Chart 命名规范（建议）

当前存在多种风格并存：
- `charts/${MODULE_PATH}/values.yaml`
- `charts/${MODULE_PATH}-controller/values.yaml`
- `charts/${MODULE_PATH}-frontend/values.yaml`

建议下一步统一命名规则（至少统一“模块名 + 角色后缀”的约定），并提供一张模块到 chart 路径映射表，作为安装脚本和文档的唯一依据。
