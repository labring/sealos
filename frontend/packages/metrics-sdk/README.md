# @labring/sealos-metrics-sdk

## 0.2.0 restoration

Restored from npm 0.1.0 source commit `382cef7f7bf3c134f08e637e36310f33562699a7` after the original SDK integration was reverted in Sealos #6857. See [CHANGELOG.md](./CHANGELOG.md) for migration changes. AppLaunchpad/Database consumers and Go monitor deployments are not migrated by this package restoration.

Supports Node.js 20+ and `@kubernetes/client-node` **0.18.x or 0.21.x**. Other client major/minor lines are not currently supported. Both versions are tested without modifying `KubeConfig.prototype`. Each client is bound to one kubeconfig; never reuse it across different users.

New application metrics: `gpu`, `gpu_memory`, `network_service_request_count`, `network_service_request_percent`. `disk` and `storage` are aliases. Disk queries require `pvcName` but no Pod; CPU/memory/GPU queries require `podName`. Network queries require `service` and `port` (1–65535) but no Pod. Short Service names are expanded to `<service>.<namespace>.svc.cluster.local`; qualified names must belong to the authenticated namespace.

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

Application memory queries now use the Go service's corrected recording rule. MySQL connections use `workloads_kubeblocks_io_instance`. Both `mysql` and `apecloud-mysql` use the existing KubeBlocks MySQL templates; validate exporter labels in the target cluster before migrating consumers. Other database types have not been added.

Raw queries preserve quoted strings, `$1` replacements and existing matching namespace selectors. `$` as a selector item is replaced once; conflicting namespace selectors are rejected. Injection only handles **explicit `{...}` selectors**. It does not scope bare metric names or parse arbitrary PromQL; `raw.query` / `database.rawQuery` are for server-generated, trusted PromQL, not untrusted end-user expressions. `injectNamespace: false` keeps the expression unchanged after namespace permission checks.

`stats` and `isPartial` are optional VictoriaMetrics extensions. Queries without `start` return instant data (`value`); queries with `start` return range data (`values`). Numeric `time: 0` and `start: 0` are retained.

Offline checks (do not read `.env` or access a cluster):

```sh
pnpm --dir frontend --filter @labring/sealos-metrics-sdk typecheck
pnpm --dir frontend --filter @labring/sealos-metrics-sdk test
pnpm --dir frontend --filter @labring/sealos-metrics-sdk build
pnpm --dir frontend --filter @labring/sealos-metrics-sdk test:package
```

`pnpm run test:integration` explicitly runs the original live-cluster example and reads `.env`. It is separate from default tests and CI.

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

Run the SDK on a Node.js server, for example in a Next.js API route. Install with `pnpm add @labring/sealos-metrics-sdk @kubernetes/client-node@^0.21.0`.

- `launchpad.query`: CPU, memory, average CPU/memory, disk/storage, GPU/GPU memory and the two network metrics described above. Supply a full Pod name for Pod metrics: the final dash-separated suffix is removed to match all replicas of the same prefix.
- `database.query`: `mysql`, `apecloud-mysql`, `postgresql`, `mongodb`, `redis`, `kafka`, `milvus`. The exported `DATABASE_QUERY_MAP` lists metrics supported by each type. Unsupported combinations fail explicitly.
- `minio.query`: `app` is the bucket name; `query` is one of `MINIO_QUERIES`. Set `minioInstance` in the constructor or `OBJECT_STORAGE_INSTANCE` in the environment.
- `database.rawQuery` / `raw.query`: `{ namespace, query, range?, injectNamespace? }`, for trusted server-generated PromQL; see the namespace-injection limitations above.

## Configuration and authentication

`kubeconfig` is required. Namespace can be explicit or read from its current context. `metricsURL` overrides `METRICS_URL`; the fallback is `http://vmselect-vm-stack-victoria-metrics-k8s-stack.vm.svc.cluster.local:8481/select/0/prometheus`.

`whitelistKubernetesHosts` overrides comma-separated `WHITELIST_KUBERNETES_HOSTS`. API servers outside that list are rewritten to `KUBERNETES_SERVICE_HOST` / `KUBERNETES_SERVICE_PORT`. Explicitly allow a test API server for local development.

Authentication checks `/readyz`, then `get pods` through `SelfSubjectAccessReview`. `authCacheTTL` defaults to 300000 milliseconds; `0` disables caching. Cache and in-flight checks belong to a single credential-bound client; permission changes take effect after expiry. Readiness and Metrics requests have 30-second timeouts. Prometheus errors returned with HTTP 200 also reject the query.

Time values are in seconds; `start` selects `/api/v1/query_range`, otherwise `/api/v1/query` is used. Results are returned without extra multiplication or unit conversion. `toSeconds`, `getTimeRange`, `formatTimestamp` remain exported.

## Packaging

ESM imports and CommonJS require are supported. Build independently with `npm run build`. `npm pack` builds first and includes only `dist`, documentation and package metadata. Publishing is a separate maintainer action. Source: `labring/sealos/frontend/packages/metrics-sdk`.
