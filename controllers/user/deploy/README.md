### How to build image

```shell
sealos build -t docker.io/labring/sealos-user-controller:latest -f Kubefile .
```

### How to run

```shell
# 可选：使用 HELM_OPTS 传递 Helm 参数，例如覆盖云 API Server 域名/端口。
# adminClusterAdmin.enabled 默认关闭；只有兼容旧部署时才建议显式开启。
# strictNamespacePodSecurity.enabled 默认开启，用于给所有 ns-* Namespace 添加 PSA labels。
# export HELM_OPTS="--set cloudAPIServerDomain=my.domain --set cloudAPIServerPort=6443 --set kubeAPI.qps=50 --set kubeAPI.burst=100 --set adminClusterAdmin.enabled=true"

sealos run docker.io/labring/sealos-user-controller:latest
```

### Reserved user names

每个 User 都会拥有并为其签发 token 的 ServiceAccount `user-system/<User.Name>`。
为避免与 user-system 中已部署的身份（例如 `user-controller-manager`）发生同名收养导致越权，
以下名称默认被拒绝创建：

- `user-controller-manager`
- `default`

如部署在 user-system 中额外创建了其他 ServiceAccount，通过
`blockedUserNames` 追加需要拒绝的名称：

```shell
export HELM_OPTS="--set blockedUserNames={front-desktop,account-controller}"
```
