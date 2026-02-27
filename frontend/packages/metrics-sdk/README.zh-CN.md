# sealos-metrics-sdk 使用文档

Sealos 的统一 TypeScript 监控 SDK，用于**直接查询 Victoria Metrics**，并通过 kubeconfig 进行 **Kubernetes 权限校验**。适合在服务端（Node/Next.js API Route）使用，不建议在浏览器端直接调用。

## 目录

- [项目简介](#项目简介)
- [安装](#安装)
- [快速开始](#快速开始)
- [MetricsClient 配置](#metricsclient-配置)
- [时间范围与查询方式](#时间范围与查询方式)
- [Launchpad 服务](#launchpad-服务)
- [Database 服务](#database-服务)
- [MinIO 服务](#minio-服务)
- [Raw PromQL 查询](#raw-promql-查询)
- [在 Next.js API Route 中使用](#在-nextjs-api-route-中使用)
- [认证与权限机制](#认证与权限机制)
- [Kubernetes Host 处理规则](#kubernetes-host-处理规则)
- [环境变量](#环境变量)
- [常见错误与排查](#常见错误与排查)
- [开发与测试](#开发与测试)
- [迁移参考](#迁移参考)

## 项目简介

- **直连 Victoria Metrics / Prometheus API**：使用 `/api/v1/query` 和 `/api/v1/query_range`，不依赖额外 Go 服务。
- **内置 K8s 权限校验**：使用 kubeconfig 调用 `SelfSubjectAccessReview`，确保用户具备 namespace 的访问权限。
- **类型安全**：提供完整的 TypeScript 类型（字符串字面量联合）。
- **PromQL 模板化**：对常用指标提供模板，自动替换 namespace / app / pod 等参数。
- **兼容 ESM 和 CJS**：输出双格式构建。

## 安装

```bash
pnpm add sealos-metrics-sdk
```

> 注意：`@kubernetes/client-node` 是 peerDependencies，请在宿主项目中安装对应版本。

## 快速开始

```ts
import { MetricsClient } from 'sealos-metrics-sdk';

const client = new MetricsClient({
  kubeconfig: kubeconfigString,
  metricsURL:
    'http://vmselect-vm-stack-victoria-metrics-k8s-stack.vm.svc.cluster.local:8481/select/0/prometheus'
});

const cpuData = await client.launchpad.query({
  namespace: 'ns-user123',
  type: 'cpu',
  podName: 'my-app-7c9b8f6d9c-abcde',
  range: {
    start: Math.floor(Date.now() / 1000) - 3600,
    end: Math.floor(Date.now() / 1000),
    step: '1m'
  }
});
```

- `namespace` 可省略：如果 kubeconfig 当前 context 含 namespace 会自动使用。
- 如果既未传 `namespace` 也无法从 context 获取，将抛出 `Namespace not found`。

## MetricsClient 配置

```ts
new MetricsClient({
  kubeconfig: string,
  metricsURL: string,
  minioInstance: string,
  whitelistKubernetesHosts: string[],
  authCacheTTL: number
});
```

- `kubeconfig`：必填，完整 kubeconfig 字符串。
- `metricsURL`：可选，Prometheus/Victoria Metrics 地址；默认值为：
  `http://vmselect-vm-stack-victoria-metrics-k8s-stack.vm.svc.cluster.local:8481/select/0/prometheus`
  也可通过环境变量 `METRICS_URL` 覆盖，最好通过构造函数传入，避免环境变量污染，而且最好传一下地址，这样比环境变量或者默认值更清晰。
- `minioInstance`：MinIO 指标的 `instance` 标签值；不传则读取 `OBJECT_STORAGE_INSTANCE`环境变量。minio 项目必填项，最好通过构造函数传入，避免环境变量污染。
- `whitelistKubernetesHosts`：可选，白名单 Kubernetes API Server 地址列表；优先级高于环境变量 `WHITELIST_KUBERNETES_HOSTS`。本地开发环境建议通过此参数显式传入。
- `authCacheTTL`：可选，认证缓存过期时间（毫秒），默认 300000 (5 分钟)，设置为 0 禁用缓存。

### 认证缓存

SDK 会缓存认证结果，避免对同一 namespace 的重复 Kubernetes API 调用。

**缓存行为：**

- **默认 TTL**：5 分钟 (300000 ms)
- **缓存键**：namespace
- **缓存数据**：权限检查结果（允许/拒绝）
- **仅内存**：进程重启后缓存清空

**配置示例：**

```typescript
// 默认配置（启用缓存，5 分钟 TTL）
const client = new MetricsClient({
  kubeconfig: '...'
});

// 自定义 TTL（10 分钟）
const client = new MetricsClient({
  kubeconfig: '...',
  authCacheTTL: 600000
});

// 禁用缓存
const client = new MetricsClient({
  kubeconfig: '...',
  authCacheTTL: 0
});
```

**性能影响：**

- 缓存命中时，每次查询节省 2 个网络请求（readyz + 权限检查）
- 特别适合高频查询同一 namespace 的场景
- 示例：对同一 namespace 的 10 次查询 = 18 个请求 → 2 个请求（减少 90%）

**安全考虑：**

- 权限变更在 TTL 过期后生效
- TTL 越短越安全，但性能越低
- 建议：大多数场景保持默认 5 分钟

## 时间范围与查询方式

所有查询参数中可带 `range`：

```ts
interface TimeRange {
  start?: number | string; // 有 start -> 使用 query_range
  end?: number | string;
  step?: string; // 建议填写，如 "1m"
  time?: string; // 无 start 时可用，用于 query
}
```

- **带 `start`**：走 `/api/v1/query_range`
- **无 `start`、有 `time`**：走 `/api/v1/query` + `time` 参数
- **无 `range`**：走 `/api/v1/query`（默认当前时刻）

> 时间戳建议使用秒级。如果你传入毫秒，可用 `toSeconds` 进行转换：

```ts
import { toSeconds, getTimeRange } from 'sealos-metrics-sdk';

const { start, end } = getTimeRange(1); // 最近 1 小时
const startSec = toSeconds(Date.now());
```

## Launchpad 服务

用于查询应用（Launchpad）相关指标。

```ts
const data = await client.launchpad.query({
  namespace: 'ns-user123',
  type: 'memory',
  podName: 'my-app-7c9b8f6d9c-abcde',
  range: { start, end, step: '1m' }
});
```

### 参数说明

- `type`: `LaunchpadMetricType`
  - `'cpu'` / `'memory'`
  - `'average_cpu'` / `'average_memory'`
  - `'storage'`（需额外传 `pvcName`）
- `podName`: **完整 Pod 名**（例如 `my-app-<rs>-<suffix>`）
  - SDK 会截断最后一段，将其作为 ReplicaSet 前缀匹配全部副本。
  - 若 `podName` 不含 `-`，可能导致前缀为空，从而匹配异常。
- `pvcName`: 仅 `Storage` 指标需要

## Database 服务

用于数据库类服务的指标查询。

```ts
const data = await client.database.query({
  namespace: 'ns-user123',
  query: 'cpu',
  type: 'postgresql',
  app: 'my-postgresql',
  range: { start, end, step: '1m' }
});
```

### 支持的数据库类型

- `'apecloud-mysql'`（apecloud-mysql）
- `'postgresql'`
- `'mongodb'`
- `'redis'`
- `'kafka'`
- `'milvus'`

### 常用指标（各数据库通用或部分通用）

- `cpu`, `memory`, `disk`, `disk_capacity`, `disk_used`, `uptime`, `connections`, `commands`

### 扩展指标（按数据库类型）

- MySQL：`innodb`, `slow_queries`, `aborted_connections`, `table_locks`
- PostgreSQL：`db_size`, `active_connections`, `rollbacks`, `commits`, `tx_duration`, `block_read_time`, `block_write_time`
- MongoDB：`db_size`, `document_ops`, `pg_faults`
- Redis：`db_items`, `hits_ratio`, `commands_duration`, `blocked_connections`, `key_evictions`
- Kafka：仅基础指标（`cpu`, `memory`, `disk`, `disk_capacity`, `disk_used`）
- Milvus：仅 `cpu`, `memory`

### rawQuery（legacy 注入）

当你希望自定义 PromQL 时，可使用 `rawQuery`：

```ts
const data = await client.database.rawQuery({
  namespace: 'ns-user123',
  query: 'sum(rate(mysql_global_status_slow_queries{$,app_kubernetes_io_instance="my-mysql"}[1m]))',
  range: { start, end, step: '1m' }
});
```

默认会进行 namespace 注入（legacy 逻辑）：

- `$` 会替换为 `namespace=~"<namespace>"`
- `{` 会变为 `{namespace=~"<namespace>",`（自动在 selector 中注入）

如需保留原始查询：

```ts
const data = await client.database.rawQuery({
  namespace: 'ns-user123',
  query: 'sum(rate(http_requests_total[1m]))',
  injectNamespace: false
});
```

## MinIO 服务

用于对象存储监控指标查询。

```ts
const data = await client.minio.query({
  namespace: 'ns-user123',
  app: 'my-bucket',
  query: 'minio_bucket_usage_total_bytes'
});
```

- `app`：对应 bucket 名称
- `minioInstance` 可在构造函数中配置，或通过 `OBJECT_STORAGE_INSTANCE` 环境变量指定
- 若 instance 为空，可能查询不到数据

可用指标：

- `'minio_bucket_usage_object_total'`
- `'minio_bucket_usage_total_bytes'`
- `'minio_bucket_traffic_received_bytes'`
- `'minio_bucket_traffic_sent_bytes'`

## Raw PromQL 查询

使用 `client.raw.query` 进行通用 PromQL 查询：

```ts
const data = await client.raw.query({
  namespace: 'ns-user123',
  query: 'sum(rate(container_cpu_usage_seconds_total{$}[1m]))',
  range: { start, end, step: '1m' }
});
```

- 同样支持 `injectNamespace: false`
- 返回结构统一为 `QueryResponse`

## 在 Next.js API Route 中使用

```ts
// app/api/metrics/launchpad/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MetricsClient } from 'sealos-metrics-sdk';
import type { LaunchpadMetricType } from 'sealos-metrics-sdk';
import { getKubeconfig } from '@/utils/auth';

export async function POST(req: NextRequest) {
  try {
    const kubeconfig = await getKubeconfig(req.headers);
    const { namespace, type, podName, range } = await req.json();

    const client = new MetricsClient({ kubeconfig });
    const data = await client.launchpad.query({
      namespace,
      type: type as LaunchpadMetricType,
      podName,
      range
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## 认证与权限机制

SDK 内部会执行以下校验流程：

1. 使用 kubeconfig 解析当前集群配置
2. 调用 `GET /readyz` 测试 API Server 可达性
3. 通过 `SelfSubjectAccessReview` 检查是否具备 `get pods` 权限

如果没有权限，会抛出：`No permission for this namespace`。

**认证缓存：**

- 每个 namespace 的权限检查结果会被缓存
- 缓存命中 = 跳过 2 个网络请求（readyz + 权限检查）
- 默认 5 分钟 TTL 确保权限变更能够快速生效
- 缓存未命中或已过期 = 执行完整认证流程

## Kubernetes Host 处理规则

如果 kubeconfig 中的 `cluster.server` **未在白名单中**，SDK 会尝试用以下方式改写为集群内地址：

- `KUBERNETES_SERVICE_HOST`
- `KUBERNETES_SERVICE_PORT`

若无法获取，会抛出：`unable to get the sealos host`。

**本地开发配置（其实是必须）：**

**方式一：SDK 配置（推荐）**

```typescript
const client = new MetricsClient({
  kubeconfig: kubeconfigString,
  whitelistKubernetesHosts: ['https://YOUR-APISERVER:6443']
});
```

**方式二：环境变量（fallback）**

```bash
export WHITELIST_KUBERNETES_HOSTS="https://YOUR-APISERVER:6443"
```

> **优先级**：SDK 配置优先级高于环境变量。建议使用 SDK 配置，更清晰明确。

这样 SDK 将直接使用 kubeconfig 中的 `server`，避免被强制改写。
白名单可以传入多个地址（SDK 配置使用数组，环境变量通过逗号隔开）。

## 环境变量

运行时环境变量：

```env
# Metrics URL (可选)
METRICS_URL=http://vmsingle-victoria-metrics-k8s-stack.vm.svc.cluster.local:8429

# MinIO instance (可选)
OBJECT_STORAGE_INSTANCE=minio-instance-name

# K8s API Server override (可选)
KUBERNETES_SERVICE_HOST=10.0.0.1
KUBERNETES_SERVICE_PORT=6443

# Whitelist K8s hosts (可选，开发环境必选)
# 注意：SDK 配置的 whitelistKubernetesHosts 优先级高于此环境变量
WHITELIST_KUBERNETES_HOSTS=https://10.0.0.1:6443,https://kubernetes.default.svc
```

测试环境变量（`pnpm test`，用于 sdk 测试脚本,调用者无需关心）：

```env
KUBECONFIG=your-kubeconfig-content-here
TEST_NAMESPACE=ns-xxx
TEST_LAUNCHPAD_NAME=my-app-abc123
TEST_DB_CLUSTER=my-mysql-cluster
TEST_BUCKET_NAME=my-bucket
METRICS_URL=http://vmauth-vm-stack-victoria-metrics-k8s-stack.vm.svc.cluster.local:8427
```

## 常见错误与排查

- `Namespace not found`：未传 `namespace`，且 kubeconfig 当前 context 无 namespace。
- `No permission for this namespace`：kubeconfig 对应用户没有该 namespace 的 `get pods` 权限。
- `unable to get the sealos host`：kubeconfig 的 server 不在白名单，且未设置 `KUBERNETES_SERVICE_HOST/PORT`。
- `Metrics API request failed: ...`：Prometheus/Victoria Metrics 请求失败，可能是地址、网络或 PromQL 错误。

## 开发与测试

```bash
pnpm install
pnpm run build
pnpm run dev
pnpm test
```

> 运行 `pnpm test` 前请准备 `.env` 或使用 `.env.example`。

## 迁移参考

旧调用（Go 服务）：

```ts
const response = await fetch('http://launchpad-monitor:8428/query', {
  method: 'POST',
  headers: {
    Authorization: encodeURIComponent(kubeconfig)
  },
  body: new URLSearchParams({ namespace, type, launchPadName: podName })
});
```

SDK 方式：

```ts
const client = new MetricsClient({ kubeconfig });
const data = await client.launchpad.query({
  namespace,
  type: 'cpu',
  podName
});
```
