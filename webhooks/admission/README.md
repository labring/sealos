# Sealos admission webhook

Provides ingress, namespace and resource-creator admission handlers.

## Helm deployment

Use `bash deploy/entrypoint.sh apply` for installation and upgrades. The
entrypoint removes the fixed resources from the old installer on first use,
then runs `helm upgrade --install`. `bash deploy/entrypoint.sh delete` removes
the Helm release while preserving the user values file. The Helm chart is in
`deploy/charts/admission-webhook`.

Helm-managed runtime resources use the `admission-webhook` naming convention,
including the Deployment and ServiceAccount. During the first migration, the
entrypoint removes the previous Kustomize `admission-controller-manager`
resources before installing the chart.

The persistent user values file is
`/root/.sealos/cloud/values/core/admission-webhook-values.yaml`; it is created
from the packaged defaults once and is never overwritten by upgrades.
On every install or upgrade, the entrypoint reads `cloudDomain` from ConfigMap
`sealos-system/sealos-config` and overrides `config.cnameDomains` with
`<domain>,hub.<domain>,cloud.sealos.io,laf.dev,laf.run`. If the ConfigMap cannot
be read or the domain is empty, it exits before cleaning up legacy resources.
The `cnameDomains` environment variable is no longer used.

Set `config.cnameAppenDomains` in the user values to a comma-separated list of
additional domains (default: `""`). The chart appends these domains to the base
list when rendering the manager arguments. `config.cnameCheck` defaults to
`false` in the user values; existing files retain their configured value.
For example:

```yaml
config:
  cnameAppenDomains: apps.example.com,custom.example.com
  cnameCheck: false
```

Run unit tests with `GOWORK=off go test -race ./...`. Kubebuilder
`config/` remains available for development; do not apply it over a Helm-managed
production release.

## 应用和数据库创建人记录

资源创建人准入 webhook 在用户命名空间内，为 AppLaunchpad 主工作负载、KubeBlocks Cluster、Devbox、ObjectStorageBucket 和 CronJob 写入以下 annotations：

- `resource.sealos.io/creator-user-cr-name`：从已认证身份提取的区域用户标识（如 `2kvpbpql`），不是桌面短 ID；非用户主体不写入。
- `resource.sealos.io/creator-type`：`user`、`service` 或 `unknown`。

创建人 webhook 不查询数据库；只记录请求身份，User.id 映射由独立 admin 应用的查询接口处理，不新增表。更新保留原记录，历史资源不因编辑补写创建人。Deployment/StatefulSet 转换在旧主资源仍存在时继承原记录；删除后重建重新记录。后台服务使用自身凭据创建时记录服务身份，不推测发起账号。

部署需要同时更新控制器镜像与 webhook 配置，由现有 admission Manager、Service 和 cert-manager 证书承载；集群镜像通过 `resourceCreatorWebhookEnabled` 控制启用（默认 `false`）。创建人 webhook 使用 `failurePolicy: Fail`：服务不可达时，匹配命名空间内的 Deployment、StatefulSet、数据库 Cluster、Devbox、ObjectStorageBucket 和 CronJob 创建/更新会被阻止；创建人处理不依赖账号映射数据库，但应用类型转换仍需读取 Kubernetes 中的原工作负载。升级应先确保新控制器端点与证书可用，再启用新 webhook；回退旧 admission 镜像前需从共享 MutatingWebhookConfiguration/ValidatingWebhookConfiguration 中移除创建人条目（集群镜像可设置 `resourceCreatorWebhookEnabled=false`），停用期间无法保证创建人记录完整。

本仓库此次仅提供创建人 webhook。创建账号、按账号查询资源、按命名空间查询资源由独立 admin 应用实现；不在 account-service 或子应用列表、详情接口增加创建人查询字段。匹配范围为带 `user.sealos.io/owner` 标签且名称以 `ns-` 开头的命名空间，应用需带 `cloud.sealos.io/app-deploy-manager` 标签，数据库支持 `apps.kubeblocks.io/v1alpha1` 与 `v1` 的顶层 Cluster。

应用管理同时保护 `metadata.annotations` 和 `spec.template.metadata.annotations` 的两个创建人字段；Pod 从模板继承，单独用于 Pod 统计，不计为独立业务。已有顶层记录的应用后续更新时会把原创建人同步到模板，这可能触发滚动更新；完全无记录的历史应用不推测创建人，已有 Pod 不批量回填。其他业务只写顶层，CronJob 的 jobTemplate 等嵌套模板不写入。Service、Ingress、PVC、ConfigMap、Secret、Job 等附属资源不注入。

新增支持 `devbox.sealos.io/v1alpha2` Devbox、`objectstorage.sealos.io/v1` ObjectStorageBucket、`batch/v1` CronJob；不把对象存储账号 ObjectStorageUser 当成桶，不对控制器派生资源重复注入。镜像服务尚未确认可标注的顶层资源，不在本 webhook 的覆盖范围；各类型的 admin 查询适配需单独交付。

创建人处理通过 `ResourceCreator.SetupWithManager` 注册到现有 admission server，跨类型准入使用 controller-runtime 的通用 `admission.Handler`，无需安装所有可选 CRD。工作负载转换使用 APIReader 直读 Kubernetes，仅增加 Deployment/StatefulSet 的 `get` 权限。

若曾部署 PR 早期 account-controller 版本，先禁用旧 account 创建人 webhook，再启用 admission 中的新条目，避免重复执行；迁移期间暂停相关资源写入。既有创建人 annotations 保留，无需回填。

创建人准入规则以 `config/webhook/resource-creator.yaml` 补丁合入共享配置，重新执行 `make manifests` 不会覆盖这些跨资源规则。

## License

Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
