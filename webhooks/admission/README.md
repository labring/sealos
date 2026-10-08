# admission
// TODO(user): Add simple overview of use/purpose

## Description
// TODO(user): An in-depth paragraph about your project and overview of use

## Getting Started
You’ll need a Kubernetes cluster to run against. You can use [KIND](https://sigs.k8s.io/kind) to get a local cluster for testing, or run against a remote cluster.
**Note:** Your controller will automatically use the current context in your kubeconfig file (i.e. whatever cluster `kubectl cluster-info` shows).

### Running on the cluster
1. Install Instances of Custom Resources:

```sh
kubectl apply -f config/samples/
```

2. Build and push your image to the location specified by `IMG`:

```sh
make docker-build docker-push IMG=<some-registry>/admission:tag
```

3. Deploy the controller to the cluster with the image specified by `IMG`:

```sh
make deploy IMG=<some-registry>/admission:tag
```

### Uninstall CRDs
To delete the CRDs from the cluster:

```sh
make uninstall
```

### Undeploy controller
UnDeploy the controller from the cluster:

```sh
make undeploy
```

## Contributing
// TODO(user): Add detailed information on how you would like others to contribute to this project

### How it works
This project aims to follow the Kubernetes [Operator pattern](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/).

It uses [Controllers](https://kubernetes.io/docs/concepts/architecture/controller/),
which provide a reconcile function responsible for synchronizing resources until the desired state is reached on the cluster.

### Test It Out
1. Install the CRDs into the cluster:

```sh
make install
```

2. Run your controller (this will run in the foreground, so switch to a new terminal if you want to leave it running):

```sh
make run
```

**NOTE:** You can also run this in one step by running: `make install run`

### Modifying the API definitions
If you are editing the API definitions, generate the manifests such as CRs or CRDs using:

```sh
make manifests
```

**NOTE:** Run `make --help` for more information on all potential `make` targets

More information can be found via the [Kubebuilder Documentation](https://book.kubebuilder.io/introduction.html)

## 应用和数据库创建人记录

资源创建人准入 webhook 在用户命名空间内，为 AppLaunchpad 主工作负载、KubeBlocks Cluster、Devbox、ObjectStorageBucket 和 CronJob 写入以下 annotations：

- `resource.sealos.io/creator-user-cr-name`：从已认证身份提取的区域用户标识（如 `2kvpbpql`），不是桌面短 ID；非用户主体不写入。
- `resource.sealos.io/creator-type`：`user`、`service` 或 `unknown`。

创建人 webhook 不查询数据库；只记录请求身份，User.id 映射由独立 admin 应用的查询接口处理，不新增表。更新保留原记录，历史资源不因编辑补写创建人。Deployment/StatefulSet 转换在旧主资源仍存在时继承原记录；删除后重建重新记录。后台服务使用自身凭据创建时记录服务身份，不推测发起账号。

部署需要同时更新控制器镜像与 webhook 配置，由现有 admission Manager、Service 和 cert-manager 证书承载；集群镜像通过 `resourceCreatorWebhookEnabled` 控制启用（默认 `true`）。创建人 webhook 使用 `failurePolicy: Fail`：服务不可达时，匹配命名空间内的 Deployment、StatefulSet、数据库 Cluster、Devbox、ObjectStorageBucket 和 CronJob 创建/更新会被阻止；创建人处理不依赖账号映射数据库，但应用类型转换仍需读取 Kubernetes 中的原工作负载。升级应先确保新控制器端点与证书可用，再启用新 webhook；回退旧 admission 镜像前需从共享 MutatingWebhookConfiguration/ValidatingWebhookConfiguration 中移除创建人条目（集群镜像可设置 `resourceCreatorWebhookEnabled=false`），停用期间无法保证创建人记录完整。

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
