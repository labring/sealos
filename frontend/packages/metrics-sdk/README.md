# sealos-metrics-sdk

Unified TypeScript SDK for Sealos metrics monitoring. Directly queries Prometheus/Victoria Metrics with built-in Kubernetes authentication.

## Features

- **Direct Prometheus/VM Queries**: No intermediate Go services required
- **Built-in K8s Authentication**: Validates user permissions using kubeconfig
- **Type Safe**: Full TypeScript type definitions with enum constraints
- **PromQL Builder**: Automatically constructs PromQL queries from parameters
- **Dual Format**: ESM and CJS output for maximum compatibility

## Installation

```bash
pnpm add sealos-metrics-sdk
```

## Architecture

```
Frontend (Next.js API Route)
    ↓
MetricsClient (SDK)
    ├── AuthService → Validates K8s permissions
    └── Query Services → Direct Prometheus/VM HTTP calls
```

**Replaces:**

- ❌ launchpad-monitor Go service
- ❌ database-monitor Go service
- ❌ minio-monitor Go service

## Usage

### Basic Setup

```typescript
import { MetricsClient, LaunchpadMetric } from 'sealos-metrics-sdk';

const client = new MetricsClient({
  kubeconfig: kubeconfigString
});

const cpuData = await client.launchpad.query({
  namespace: 'ns-user123',
  type: LaunchpadMetric.CPU,
  launchPadName: 'my-app',
  range: {
    start: Math.floor(Date.now() / 1000) - 3600,
    end: Math.floor(Date.now() / 1000),
    step: '1m'
  }
});
```

### Launchpad Service

Queries Victoria Metrics for application metrics:

```typescript
const result = await client.launchpad.query({
  namespace: 'ns-user123',
  type: LaunchpadMetric.Memory,
  launchPadName: 'my-app-abc123',
  range: {
    start: startTime,
    end: endTime,
    step: '1m'
  }
});
```

**Available Metrics:**

- `LaunchpadMetric.CPU` - CPU usage percentage
- `LaunchpadMetric.Memory` - Memory usage percentage
- `LaunchpadMetric.AverageCPU` - Average CPU across pods
- `LaunchpadMetric.AverageMemory` - Average memory across pods
- `LaunchpadMetric.Storage` - PVC usage (requires `pvcName` parameter)

**PromQL Generated:**

```promql
# CPU example
round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{
  namespace=~"ns-user123",pod=~"my-app.*"
}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{
  namespace=~"ns-user123",pod=~"my-app.*"
}) by (pod) * 100,0.01)
```

### Database Service

Queries Prometheus for database metrics:

```typescript
const result = await client.database.query({
  namespace: 'ns-user123',
  query: 'cpu',
  type: DatabaseType.MySQL,
  app: 'my-mysql-cluster',
  range: {
    start: startTime,
    end: endTime,
    step: '1m'
  }
});
```

Raw PromQL (legacy `/query` style with namespace injection):

```typescript
const result = await client.database.rawQuery({
  namespace: 'ns-user123',
  query:
    'sum(rate(mysql_global_status_slow_queries{$,app_kubernetes_io_instance="my-mysql-cluster"}[1m]))',
  range: {
    start: startTime,
    end: endTime,
    step: '1m'
  }
});
```

> By default it injects namespace in the legacy way (`$` and `{` replacements). Set
> `injectNamespace: false` if you want to keep the query untouched.

Generic raw PromQL (not tied to DB type):

```typescript
const result = await client.raw.query({
  namespace: 'ns-user123',
  query: 'sum(rate(container_cpu_usage_seconds_total{$}[1m]))',
  range: {
    start: startTime,
    end: endTime,
    step: '1m'
  }
});
```

**Supported Databases:**

- `DatabaseType.MySQL` - Apecloud MySQL
- `DatabaseType.PostgreSQL` - PostgreSQL
- `DatabaseType.MongoDB` - MongoDB
- `DatabaseType.Redis` - Redis
- `DatabaseType.Kafka` - Kafka
- `DatabaseType.Milvus` - Milvus

**Common Metrics:**

- `cpu` - CPU usage percentage
- `memory` - Memory usage percentage
- `disk` - Disk usage percentage
- `disk_capacity` - Total disk capacity
- `disk_used` - Used disk space
- `uptime` - Service uptime in seconds
- `connections` - Active connections
- `commands` - Command execution rate

**Extended Metrics (DB-specific):**

- MySQL: `innodb`, `slow_queries`, `aborted_connections`, `table_locks`
- PostgreSQL: `db_size`, `active_connections`, `rollbacks`, `commits`, `tx_duration`, `block_read_time`, `block_write_time`
- MongoDB: `db_size`, `document_ops`, `pg_faults`
- Redis: `db_items`, `hits_ratio`, `commands_duration`, `blocked_connections`, `key_evictions`

### MinIO Service

Queries Prometheus for object storage metrics:

```typescript
const result = await client.minio.query({
  namespace: 'ns-user123',
  query: MinioMetric.BucketUsageObjectTotal,
  type: 'minio',
  app: 'my-bucket'
});
```

**Available Metrics:**

- `MinioMetric.BucketUsageObjectTotal` - Total objects in bucket
- `MinioMetric.BucketUsageTotalBytes` - Total bucket size in bytes
- `MinioMetric.BucketTrafficReceivedBytes` - Incoming traffic
- `MinioMetric.BucketTrafficSentBytes` - Outgoing traffic

### Next.js API Route Integration

```typescript
// app/api/metrics/launchpad/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MetricsClient, LaunchpadMetric } from 'sealos-metrics-sdk';
import { getKubeconfig } from '@/utils/auth';

export async function POST(req: NextRequest) {
  try {
    const kubeconfig = await getKubeconfig(req.headers);
    const { namespace, type, launchPadName, range } = await req.json();

    const client = new MetricsClient({ kubeconfig });

    const data = await client.launchpad.query({
      namespace,
      type: type as LaunchpadMetric,
      launchPadName,
      range
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Environment Variables

```env
# Metrics URL (optional, uses default if not set)
METRICS_URL=http://vmsingle-victoria-metrics-k8s-stack.vm.svc.cluster.local:8429

# MinIO instance for metrics (optional)
OBJECT_STORAGE_INSTANCE=minio-instance-name

# K8s API server override (optional, aligns with legacy services)
KUBERNETES_SERVICE_HOST=10.0.0.1
KUBERNETES_SERVICE_PORT=6443

# Whitelist K8s hosts (optional, comma-separated)
WHITELIST_KUBERNETES_HOSTS=https://10.0.0.1:6443,https://kubernetes.default.svc
```

### Development Guide (Outside Cluster)

If your dev environment is not running inside the Kubernetes cluster, you can allow the SDK to
use the `server` from your kubeconfig by whitelisting it. This avoids the in-cluster host override.

```bash
export WHITELIST_KUBERNETES_HOSTS="https://YOUR-APISERVER:6443"
```

Tip: Use this when your kubeconfig points to a reachable API server (VPN/localhost/port‑forward).

### Custom Configuration

```typescript
const client = new MetricsClient({
  kubeconfig: kubeconfigString,
  metricsURL: 'http://custom-metrics:8429',
  minioInstance: 'custom-minio-instance'
});
```

## How It Works

### 1. Authentication

SDK uses `@kubernetes/client-node` to validate user permissions:

```typescript
// Checks if user has 'get pods' permission in namespace
await authService.authenticate(namespace);
```

### 2. PromQL Construction

Builds queries from templates with parameter substitution:

```typescript
// Template
"round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~\"#\",pod=~\"@-mysql-\\\\d\"}) by (pod) * 100,0.01)";

// After substitution
"round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~\"ns-user123\",pod=~\"my-app-mysql-\\\\d\"}) by (pod) * 100,0.01)";
```

### 3. Direct API Call

```typescript
POST http://prometheus:9090/api/v1/query_range
Content-Type: application/x-www-form-urlencoded

query=<constructed_promql>&start=<timestamp>&end=<timestamp>&step=1m
```

## API Reference

### MetricsClient

**Constructor:**

```typescript
new MetricsClient(config: MetricsClientConfig)
```

**Config:**

```typescript
interface MetricsClientConfig {
  kubeconfig: string;
  metricsURL?: string;
  minioInstance?: string;
}
```

**Properties:**

- `launchpad: LaunchpadService` - Queries for application metrics
- `database: DatabaseService` - Queries for database metrics
- `minio: MinioService` - Queries for object storage metrics

### Services

Each service provides a `query` method:

```typescript
query(params: QueryParams): Promise<QueryResult>
```

**Authentication**: Automatically validates user permissions before querying.

**Error Handling**: Throws errors for:

- Missing/invalid kubeconfig
- No permission for namespace
- Prometheus/VM connection failures
- Invalid query parameters

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Watch mode
pnpm run dev
```

## Migration Guide

### From Go Services

**Before:**

```typescript
// Called Go service
const response = await fetch('http://launchpad-monitor:8428/query', {
  method: 'POST',
  headers: {
    Authorization: encodeURIComponent(kubeconfig)
  },
  body: new URLSearchParams({ namespace, type, launchPadName })
});
```

**After:**

```typescript
// Direct SDK call
const client = new MetricsClient({ kubeconfig });
const data = await client.launchpad.query({
  namespace,
  type: LaunchpadMetric.CPU,
  launchPadName
});
```

## License

Apache-2.0
