# Sealos Helm 横向参数（Globals）设计文档

## 0. 目标与范围

本文用于先把“横向参数问题”整理清楚，作为后续新模块配置设计的统一输入。
当前阶段聚焦：

1. 梳理现有 ConfigMap 的用途与边界。
2. 统一定义 `globals` 的配置模型（含 feature gates）。
3. 固化模块读取顺序与覆盖优先级。

## 1. 问题整理

### 1.1 当前现象

1. 配置分散在多份 ConfigMap，参数来源不统一。
2. 既有平台级参数（如 `sealos-config`），也有模块私有参数并存。
3. 一部分高敏字段（密码、URI、JWT）仍在 ConfigMap 明文存储。
4. 模块侧读取规则不统一，容易出现“同名参数覆盖歧义”。

### 1.2 本次整理目标

1. 给每个 CM 一个明确用途定位。
2. 给新 `globals` 一个可扩展骨架，承载横向 feature（`gpu_hami`、`online_ide`、`import_ide`、`gitea_template`、`nfs`）。
3. 明确“加载顺序”和“生效优先级”两套规则，避免误解。

## 2. 当前配置构成（基于现网快照）

### 2.1 已确认用途（仓库内可检索到消费者）

| ConfigMap | 主要用途 | 典型消费者（示例） | 消费方式 | 敏感级别 |
| --- | --- | --- | --- | --- |
| `sealos-config` | 平台基础全局参数中心（域名、区域、数据库、JWT、密码盐） | `scripts/cloud/install-v2.sh`、`frontend/desktop/deploy/desktop-frontend-entrypoint.sh`、`controllers/account/deploy/account-controller-entrypoint.sh`、`controllers/terminal/deploy/terminal-controller-entrypoint.sh`、`controllers/resources/deploy/resources-controller-entrypoint.sh` | 脚本通过 `kubectl get configmap` 读取，再映射为 Helm `--set-string` | 高 |
| `cert-config` | 证书发放模式与状态（如 `self-signed` / `acmedns`） | `scripts/cloud/install-v2.sh`、`deploy/base/sealos-finish/v0.1.0/install.sh`、`deploy/base/sealos-certs/v0.1.0/charts/certs/templates/*.yaml` | 运行时读取 `CERT_MODE`；证书 Chart 写入该 ConfigMap | 低 |
| `nm-agent-config` | 流量/计费链路 Mongo 连接入口（`MONGO_URI`） | `controllers/account/deploy/account-controller-entrypoint.sh`、`controllers/resources/deploy/resources-controller-entrypoint.sh` | 自动配置脚本读取并注入控制器 Chart | 高 |
| `objectstorage-config` | 对象存储账号参数（尤其根账号） | `controllers/resources/deploy/resources-controller-entrypoint.sh` | 读取 `MINIO_ROOT_USER/PASSWORD` 后注入 `resources-controller` | 高 |
| `sealos-cloud-admin` | 初始化管理员密码持久化存储 | `controllers/job/init/deploy/job-init-entrypoint.sh` | `job-init` 启动时“读取或生成并回写”密码 | 高 |
| `devbox-startup` | DevBox 启动脚本模板源（`startup.sh`） | `controllers/devbox/internal/controller/devbox_sync_pipeline.go`、`controllers/devbox/internal/controller/helper/devbox.go` | 控制器把模板脚本同步到每个 DevBox 专属 ConfigMap 并挂载 | 中 |
| `higress-config` | Higress 网关插件配置与 wasm 仓库参数 | `deploy/base/higress/v2.1.3/charts/higress/charts/higress-core/templates/*.yaml`、`scripts/cloud/install.sh` | Higress Core 挂载/读取；安装脚本支持 patch | 中 |

注：`sealos-config` 是当前唯一明确承担“横向公共参数中心”职责的配置源。

### 2.2 待补全链路（快照存在，但仓库内未检索到直接消费者）

| ConfigMap | 推断用途（基于字段语义） | 关键字段（示例） | 当前判断 |
| --- | --- | --- | --- |
| `devbox-config` | DevBox 镜像仓库访问配置（提交/拉取镜像凭据） | `registryAddress` `registryUsername` `registryPassword` | 待确认消费链路（可能在运行镜像内） |
| `registry-config` | 平台内置镜像仓库账号体系（admin/auth） | `ADMIN_USER` `ADMIN_PASSWORD` `AUTH_USER` `AUTH_PASSWORD` | 待确认消费组件 |
| `grafana-config` | 监控 UI 访问入口和登录信息 | `GF_ADDRESS` `GF_USER` `GF_PASSWORD` | 待确认是否由前端/后端透传 |
| `hami-webui-config` | HAMI 管理页入口和登录信息 | `HAMI_WEBUI_ADDRESS` `HAMI_WEBUI_USER` `HAMI_WEBUI_PASSWORD` | 待确认消费组件 |
| `vlogs-config` | 平台日志服务写读账号与地址 | `ADDRESS` `INSER_*` `SELECT_*` | 待确认消费组件 |
| `vlogs-config-user` | 用户日志服务写读账号与地址 | `ADDRESS` `INSER_*` `SELECT_*` | 待确认消费组件 |
| `vmui-config` | VictoriaMetrics UI 访问参数 | `VMUI_ADDRESS` `VMUI_USER` `VMUI_PASSWORD` | 待确认消费组件 |

## 3. `globals` 配置草案（Feature 维度）

### 3.1 设计原则

1. 开关与参数分离：`feature_gates` 只放布尔开关，`feature_configs` 放细节参数。
2. 参数命名统一使用 `snake_case`。
3. 高敏值后续迁移到 Secret；`globals` 只保留引用信息（如 `secret_name`）。

### 3.2 建议结构

```yaml
globals:
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

### 3.3 Feature 与现有 CM 的第一版映射

1. `gpu_hami` -> `hami-webui-config`
2. `online_ide` -> `devbox-startup` + `devbox-config`
3. `import_ide` -> 新增（当前无统一开关）
4. `gitea_template` -> 新增（当前无统一配置）
5. `nfs` -> 新增（当前无专门全局配置）

## 4. 模块读取顺序与优先级（统一规则）

1. 配置加载顺序（执行顺序，前低后高）：
   - `charts/<module>/values.yaml`
   - `/root/.sealos/cloud/values/globals.yaml`
   - `/root/.sealos/cloud/values/core/<module>-values.yaml`（示例：`desktop-values.yaml`）
2. 最终生效优先级（高 -> 低）：
   - `HELM_OPTIONS/--set/--set-string`
   - `/root/.sealos/cloud/values/core/<module>-values.yaml`
   - `/root/.sealos/cloud/values/globals.yaml`
   - `charts/<module>/values.yaml`
3. Feature 判定规则：
   - 先读 `globals.feature_gates.<feature>`。
   - 为 `false` 时，忽略 `feature_configs.<feature>` 与模块私有同名开关，回退默认行为。

示例（desktop）：
```bash
helm upgrade -i desktop-frontend charts/desktop-frontend \
  -f charts/desktop-frontend/values.yaml \
  -f /root/.sealos/cloud/values/globals.yaml \
  -f /root/.sealos/cloud/values/core/desktop-values.yaml
```

## 5. 后续落地建议（供下一阶段使用）

1. 先补全 2.2 中 CM 的真实消费链路（谁读、何时读、如何覆盖）。
2. 给 `globals.yaml` 增加 schema 校验（字段类型、默认值、枚举）。
3. 逐步把高敏字段从 ConfigMap 迁移到 Secret 引用。
