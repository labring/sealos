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

### Upgrading from the standalone app controller

The user controller package now includes the App, Template, and Instance APIs
and CRDs. After Helm installation and CRD application succeed, the entrypoint
waits up to five minutes for the user release's Deployment rollout to complete,
then deletes `app-system/app-controller-manager` and its owned ReplicaSets/Pods.
If installation, CRD application, or rollout fails, this cleanup does not run.
Missing legacy Deployments are ignored, so fresh installations and repeated
upgrades can use the same entrypoint. App CRDs, App/Template/Instance objects,
the `app-system` namespace, and its remaining resources are preserved.

Run the entrypoint regression tests with:

```shell
python3 controllers/user/deploy/test_entrypoint.py
```
