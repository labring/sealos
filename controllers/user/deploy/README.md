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

### Startup health checks

The manager/service startup probe uses the same local HTTP endpoint as the
liveness probe. It runs every 5 seconds, with a 2-second timeout and a failure
threshold of 60 (approximately five minutes). Liveness and readiness probes
begin only after startup succeeds. This protects slow initialization without
checking external dependencies in liveness.

Override `startupProbe` in the chart values file supplied with `helm upgrade -f`
(or the persisted user values file used by the deployment entrypoint), for
example `startupProbe.failureThreshold: 120` for approximately ten minutes.
Defaults are included in the chart and its shipped user values where present.
These are Kubernetes probe settings; no application environment variable is used.

Readiness also requires the webhook server to have started when webhooks are
enabled, in addition to the existing user-count cache check. With the existing
`DISABLE_WEBHOOKS=true` setting, the webhook readiness check is not registered.

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
