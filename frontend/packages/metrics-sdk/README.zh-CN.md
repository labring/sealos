# @labring/sealos-metrics-sdk 使用文档

## 0.2.0 恢复与升级

源码恢复自 npm 0.1.0 对应提交 `382cef7f7bf3c134f08e637e36310f33562699a7`。原接入在 Sealos #6857 中被回退。变更见 [CHANGELOG.md](./CHANGELOG.md)。本次仅恢复升级 SDK，产品接入与 Go 监控服务部署仍由后续迁移处理。

- 支持 Node.js 20+，以及 `@kubernetes/client-node` **0.18.x 或 0.21.x**，两版均有测试，无需修改第三方类的原型。其他版本暂未纳入兼容范围。
- 新增 `gpu`、`gpu_memory`、`network_service_request_count`、`network_service_request_percent`。
- `disk` 与 `storage` 为同义指标；PVC 查询只需 `pvcName`，无需 `podName`。CPU、内存、GPU 查询需要 `podName`。
- 网络查询只需 `service` 与 `port`（1–65535）；短服务名会补全为 `<service>.<namespace>.svc.cluster.local`，完整服务名必须属于已鉴权的 namespace。
- 应用内存查询同步 Go 服务的 recording rule 修复；MySQL 连接数使用 `workloads_kubeblocks_io_instance` 标签。`mysql` 与 `apecloud-mysql` 共用现有 KubeBlocks MySQL 模板，产品迁移前需在目标集群核对 exporter 标签。没有扩展其他数据库类型。
- raw 查询只在显式 `{...}` selector 中插入 namespace，保留字符串中的 `{}`、正则量词和 `$1`。已有同 namespace 的 matcher 不重复插入，跨 namespace 的 matcher 会报错。该兼容功能并非完整 PromQL 权限边界；raw 接口用于服务端生成的可信查询，不用于直接执行终端用户输入。`injectNamespace: false` 在权限检查后原样发送查询。
- `stats`、`isPartial` 是可选的 VictoriaMetrics 扩展；即时查询使用 `value`，范围查询使用 `values`。支持数字类型的 `time: 0` 与 `start: 0`。
- 每个 client 绑定一份 kubeconfig，缓存只属于该用户，不能跨用户复用 client。

```ts
await client.launchpad.query({ type: 'storage', namespace, pvcName: 'data-app-0' });
await client.launchpad.query({ type: 'gpu', namespace, podName: 'app-hash-pod' });
await client.launchpad.query({
  type: 'network_service_request_count',
  namespace,
  service: 'web',
  port: 8080
});
```

默认测试不读取 `.env`、不访问真实集群：

```sh
pnpm --dir frontend --filter @labring/sealos-metrics-sdk typecheck
pnpm --dir frontend --filter @labring/sealos-metrics-sdk test
pnpm --dir frontend --filter @labring/sealos-metrics-sdk build
pnpm --dir frontend --filter @labring/sealos-metrics-sdk test:package
```

原始联调脚本通过 `pnpm run test:integration` 单独运行，会读取 `.env`，不参与默认测试和 CI。

## API

```ts
import { MetricsClient } from '@labring/sealos-metrics-sdk';

const client = new MetricsClient({
  kubeconfig,
  metricsURL: 'http://vmselect.vm.svc:8481/select/0/prometheus'
});
await client.database.query({
  namespace: 'ns-example',
  type: 'postgresql',
  app: 'my-db',
  query: 'cpu',
  range: { start: 0, end: 3600, step: '1m' }
});
```

只在 Node.js 服务端（例如 Next.js API Route）调用，通过 `pnpm add @labring/sealos-metrics-sdk @kubernetes/client-node@^0.21.0` 安装。

- `launchpad.query`：CPU、内存、平均 CPU/内存、disk/storage、GPU/显存及前述两种网络指标。Pod 指标应传完整 Pod 名，SDK 会移除最后一个连字符之后的后缀，再匹配同前缀副本。
- `database.query`：支持 `mysql`、`apecloud-mysql`、`postgresql`、`mongodb`、`redis`、`kafka`、`milvus`。每种类型的指标见导出的 `DATABASE_QUERY_MAP`；不支持的组合明确报错。
- `minio.query`：`app` 是 bucket 名，`query` 取自 `MINIO_QUERIES`。实例标签通过构造参数 `minioInstance` 或环境变量 `OBJECT_STORAGE_INSTANCE` 指定。
- `database.rawQuery` / `raw.query`：参数为 `{ namespace, query, range?, injectNamespace? }`，用于可信的服务端 PromQL，namespace 注入边界见上文。

## 配置与鉴权

`kubeconfig` 必填。namespace 可显式传入，或从当前 context 读取。指标地址优先级为 `metricsURL` 参数、`METRICS_URL` 环境变量、默认地址 `http://vmselect-vm-stack-victoria-metrics-k8s-stack.vm.svc.cluster.local:8481/select/0/prometheus`。

`whitelistKubernetesHosts` 参数优先于逗号分隔的 `WHITELIST_KUBERNETES_HOSTS`。不在白名单的 API Server 被改写为 `KUBERNETES_SERVICE_HOST` / `KUBERNETES_SERVICE_PORT`。本地开发应显式允许测试 API Server。

先检查 `/readyz`，再通过 `SelfSubjectAccessReview` 确认 namespace 的 `get pods` 权限。`authCacheTTL` 默认 300000 毫秒，`0` 关闭缓存。缓存及并发鉴权合并只属于绑定同一用户凭证的 client，权限变更在缓存过期后生效。readiness 与指标请求的超时均为 30 秒；HTTP 200 中的 Prometheus 错误响应也会报错。

时间单位为秒；传 `start` 时调用 `/api/v1/query_range`，否则调用 `/api/v1/query`。SDK 原样返回指标，不额外乘以 100 或转换单位。保留导出的 `toSeconds`、`getTimeRange`、`formatTimestamp` 工具。

## 构建与发布

同时支持 ESM import 和 CommonJS require，可独立执行 `npm run build`。`npm pack` 自动先构建，仅打包 `dist`、文档和 package 元数据，发布需单独执行。源码位于 `labring/sealos/frontend/packages/metrics-sdk`。
