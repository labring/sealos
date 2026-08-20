# Global YAML 使用规范

## 概要

`global.yaml` 是从 `sealos.env` 迁移出来的安装配置和运行默认值的统一配置文件。后续新增可配置的运行默认值，默认应遵循这套规范，除非有明确原因必须保留在其他接口。

本文是当前使用规范。早期 Helm global 设计文档仍可作为设计背景，但实际实现应以本文规范为准。

安装脚本运行时读取的本地路径是：

```text
/root/.sealos/cloud/values/global.yaml
```

集群内副本保存在 `sealos-system/global` ConfigMap 的 `global.yaml` key 中。

## 目标

- 把已迁移配置集中到一个结构化 YAML 文件。
- 停止把新的运行默认值继续加入 `sealos.env`。
- 为 shell 脚本提供统一的本地和集群 global 配置读取方式。
- 明确 `sealos-system/sealos-config` 的使用方式，因为很多 cloud 组件会直接读取它。

## 非目标

- 本规范不改变当前安装行为。
- 本规范不一次性迁移所有现存环境变量。
- 本规范不移除 `sealos-config`，只说明它应该如何使用。

## 配置归属

`global.yaml` 是用户可控全局配置的来源。已经迁移到 `global.yaml` 的字段，禁止再从 `sealos.env` 读取。

`sealos.env` 只用于仍未迁移的历史环境变量、节点 bootstrap 配置、未迁移的 secret，或现有脚本仍需要的兼容值。

`sealos-system/sealos-config` 用于已部署组件消费的运行期配置。`sealos-config` 中的大部分值应该由 `global.yaml` 渲染或由安装流程生成。

## 本地文件使用方式

安装脚本应读取：

```text
/root/.sealos/cloud/values/global.yaml
```

安装开始后，组件脚本不要再散落读取 `./values/global.yaml`。bundle 本地路径只用于打包默认值和安装前渲染。例如 `install --default` 可以先更新 bundle 本地的 `./values/global.yaml`，再复制到 `/root/.sealos/cloud/values/global.yaml`。

## 推荐 Shell API

install bundle 内的脚本应 source `scripts/tools.sh` 并使用共享 helper。

### 从本地 global 文件读取值：

```bash
source /root/.sealos/cloud/scripts/tools.sh

cloud_domain="$(read_yaml_file_path '.global.http.domain')"
dry_run="$(read_yaml_file_path '.global.install.dryRun')"
currency="$(read_yaml_file_path '.global.billing.currency')"
```

读取列表长度：

```bash
volume_group_count="$(read_yaml_file_path '(.global.storage.openebs.volumeGroups // []) | length')"
```

### 从集群 global ConfigMap 读取值：

```bash
source /root/.sealos/cloud/scripts/tools.sh

# 默认 namespace=sealos-system，ConfigMap=global，key=global.yaml。
cloud_domain="$(fetch_global_config_value '.global.http.domain')"
database_version="$(fetch_global_config_value '.global.featureConfigs.database.version')"

# 完整签名：
# fetch_global_config_value <path_expr> [namespace] [configmap_name] [data_key] [retries] [delay_seconds]
cloud_domain="$(fetch_global_config_value '.global.http.domain' sealos-system global global.yaml 5 3)"
```

当配置来源应以集群 ConfigMap 为准，而不是本地文件时，使用 `fetch_global_config_value`。该 helper 会先读取 `global.yaml` 这个 data key，再用和 `read_yaml_file_path` 相同的 `yq` path 表达式取值。

helper 对缺失字段返回空字符串。调用方应在靠近消费位置显式兜底：

```bash
kubeblocks_version="$(read_yaml_file_path '.global.featureConfigs.database.kubeblocksVersion')"
kubeblocks_version="${kubeblocks_version:-0.8.2}"
```

## 直接读取 YAML

不在 install helper 环境中的小脚本，可以直接用 `yq` 读取 YAML：

```bash
yq e -r '.global.http.domain // ""' /root/.sealos/cloud/values/global.yaml
yq e -r '.global.cert.mode // "self-signed"' /root/.sealos/cloud/values/global.yaml
```

当 `tools.sh` 可用时优先使用共享 helper。除非脚本无法 source `tools.sh`，否则不要新增本地 YAML 解析函数。

## 字段设计规则

- 使用嵌套对象，不新增环境变量风格的扁平 key。
- YAML 字段名使用 lower camel case，例如 `dryRun`、`disableHttps`、`kubeblocksVersion`。
- 布尔值使用 YAML boolean，不使用字符串布尔值。
- 当 `x.y` 或 `vX.Y.Z` 可能被错误解析时，版本号使用字符串。
- 组件专属配置放在 `global.featureConfigs.<component>` 或已有领域对象下。
- 存储配置放在 `global.storage` 下。
- HTTP 入口配置放在 `global.http` 下。
- 证书配置放在 `global.cert` 下。
- 当创建行为可以由必要 endpoint 推导时，不新增 `create` 开关。例如 NFS StorageClass 是否创建由 `global.storage.openebs.nfs.storageClass.parameters.server` 是否为空推导。

## 当前常用字段

```yaml
global:
  install:
    dryRun: false
  billing:
    currency: cny
  cert:
    mode: self-signed
    certFile: ""
    keyFile: ""
  http:
    domain: 127.0.0.1.nip.io
    httpsPort: 443
    httpPort: 80
    disableHttps: false
  storage:
    openebs:
      storage: /data/openebs
      vgName: ""
      volumeGroups: []
      nfs:
        storageClass:
          name: nfs-csi
          annotations:
            storageclass.kubernetes.io/is-default-class: "false"
          parameters:
            server: ""
            share: /
            subDir:
            mountPermissions: "0777"
          reclaimPolicy: Delete
          volumeBindingMode: Immediate
          mountOptions:
            - nfsvers=4.1
            - hard
  featureConfigs:
    database:
      type: cockroachdb
      kubeblocksVersion: "0.8.2"
      version: v23.1.11
      mongodbURI: ""
      nmAgentMongodbURI: ""
```

## `sealos-system/sealos-config`

`sealos-config` 是 `sealos-system` 命名空间下的运行期 ConfigMap。很多 cloud 组件会读取它。它应该被视为生成后的运行状态，而不是新增用户可见配置的首选位置。

直接读取单个 key：

```bash
kubectl get configmap sealos-config -n sealos-system \
  -o jsonpath='{.data.cloudDomain}'
```

需要重试能力时，优先使用 helper：

```bash
source /root/.sealos/cloud/scripts/tools.sh

cloud_domain="$(fetch_configmap_field sealos-config '{.data.cloudDomain}')"
jwt_internal="$(fetch_configmap_field sealos-config '{.data.jwtInternal}')"
```

常用 key：

| Key | 含义 | 典型来源 |
| --- | --- | --- |
| `cloudDomain` | 公网访问域名 | `global.http.domain` |
| `cloudPort` | HTTPS 端口 | `global.http.httpsPort` |
| `httpPort` | HTTP 端口 | `global.http.httpPort` |
| `disableHttps` | 是否禁用 HTTPS | `global.http.disableHttps` |
| `regionUID` | 安装时生成的 region 标识 | 安装流程 |
| `databaseGlobalCockroachdbURI` | global CockroachDB 连接 URI | `global.featureConfigs.globalDatabase.uri` 或安装生成的数据库 |
| `databaseLocalCockroachdbURI` | local CockroachDB 连接 URI | `global.featureConfigs.localDatabase.uri` 或安装生成的数据库 |
| `databaseMongodbURI` | MongoDB 连接 URI | `global.featureConfigs.database.mongodbURI` 或安装生成的数据库 |
| `databaseType` | 数据库后端类型 | `global.featureConfigs.database.type` |
| `passwordSalt` | 服务使用的密码盐 | 安装生成或 `global.featureConfigs.regionInfo.passwordSalt` |
| `jwtInternal` | 内部 JWT secret | 安装生成 |
| `jwtRegional` | region JWT secret | 安装生成 |
| `jwtGlobal` | global JWT secret | 安装生成或 `global.featureConfigs.regionInfo.jwtGlobal` |

## 同步规则

当某个 `global.yaml` 字段会写入运行期 ConfigMap 时，应由同步脚本作为该派生 key 的唯一写入方。例如 `global.http` 会同步到 `sealos-system/sealos-config` 中的 `cloudDomain`、`cloudPort`、`httpPort`、`disableHttps`。

组件脚本在做安装期决策时读 `global.yaml`；读取已经发布到集群的运行期值时读 `sealos-config`。

## 新增 Global 字段流程

1. 在 bundle 的 `values/global.yaml` 中新增字段。
2. 如果用户需要编辑该字段，在安装 README 中说明。
3. 通过 `read_yaml_file_path` 或 `fetch_global_config_value` 读取。
4. 如果运行组件需要该字段，显式同步到 ConfigMap。
5. 增加保护，避免同一个配置继续通过 `sealos.env` 配置。
6. 增加或更新验证，证明该字段确实从 `global.yaml` 读取。

## 迁移模式

把环境变量迁移到 `global.yaml` 时：

1. 新增 YAML 字段，并保持当前默认值。
2. 替换消费方，改为读取 YAML path。
3. 只有确实需要时保留兼容，并在代码中明确体现。
4. 禁止通过 `sealos.env` 设置已迁移环境变量。
5. 更新用户文档和 proposal 规范。

## 验证

涉及 `global.yaml` 规范的改动建议使用以下检查：

```bash
bash -n install/pro/<version>/scripts/*.sh
yq e '.global' install/pro/<version>/values/global.yaml
rg -n 'SEALOS_V2_OLD_KEY|oldYamlPath' install/pro openebs
```
