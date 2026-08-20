# job-heartbeat

## 说明
sealos run 镜像时会在目标节点执行 Kubefile，本镜像通过 Helm 安装/升级 heartbeat CronJob。

## 必填参数

**无**

## 如何运行

```shell
# 最简配置
sealos run ghcr.io/labring/sealos-job-heartbeat-controller:latest
```

## 可选参数

- RELEASE_NAMESPACE: Helm 安装命名空间，默认 `heartbeat-system`
- RELEASE_NAME: Helm release 名称，默认 `heartbeat`
- HELM_OPTS: 透传 Helm 参数（例如 `--set schedule="0 */6 * * *"`）
- CHART_PATH: Helm chart 路径，默认 `./charts/heartbeat`

## 示例

```shell
# 1. 最简配置（每天午夜执行）
sealos run ghcr.io/labring/sealos-job-heartbeat-controller:latest

# 2. 自定义命名空间和执行计划
sealos run ghcr.io/labring/sealos-job-heartbeat-controller:latest \
  --env RELEASE_NAMESPACE="my-namespace" \
  --env HELM_OPTS="--set schedule=\"0 */6 * * *\""

# 3. 自定义资源限制
sealos run ghcr.io/labring/sealos-job-heartbeat-controller:latest \
  --env HELM_OPTS="--set resources.limits.cpu=500m --set resources.limits.memory=256Mi"

# 4. 组合多个参数
sealos run ghcr.io/labring/sealos-job-heartbeat-controller:latest \
  --env RELEASE_NAMESPACE="production" \
  --env HELM_OPTS="--set schedule=\"0 2 * * *\" --set activeDeadlineSeconds=1800"
```

## Helm Chart 可配置参数

可通过 `HELM_OPTS` 传递以下参数：

- `schedule`: Cron 执行计划，默认 `"0 0 * * *"`（每天午夜执行）
- `activeDeadlineSeconds`: Job 超时时间，默认 `600`
- `backoffLimit`: 重试次数，默认 `1`
- `image`: 容器镜像，默认 `ghcr.io/labring/sealos-job-heartbeat-controller:latest`
- `imagePullPolicy`: 镜像拉取策略，默认 `Always`
- `resources.limits.cpu/memory`: CPU/内存限制
- `resources.requests.cpu/memory`: CPU/内存请求
- `nodeSelector`: 节点选择器
- `tolerations`: 容忍度配置
- `affinity`: 亲和性配置

## 测试立即创建job：

```shell
kubectl create job --from=cronjob/heartbeat-cronjob heartbeat-manual-$(date +%Y%m%d-%H%M%S) -n heartbeat-system
```