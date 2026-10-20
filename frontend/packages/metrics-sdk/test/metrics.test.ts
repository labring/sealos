import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { MetricsClient, AuthService } from '../src';
import { injectNamespace } from '../src/utils/promql';

async function fixture() {
  const queries: { path: string; form: URLSearchParams }[] = [];
  const reviews: { namespace: string; authorization?: string }[] = [];
  let readyRequests = 0;
  let readyStatus = 200;
  let queryError = false;
  const response = { status: 'success', data: { resultType: 'matrix', result: [] } };
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks).toString();
    if (req.url === '/k8s/readyz') {
      readyRequests++;
      res.writeHead(readyStatus).end('ok');
    } else if (req.url === '/k8s/apis/authorization.k8s.io/v1/selfsubjectaccessreviews') {
      const review = JSON.parse(body);
      const ns = review.spec.resourceAttributes.namespace;
      reviews.push({ namespace: ns, authorization: req.headers.authorization });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ...review, status: { allowed: ns !== 'denied' } }));
    } else if (req.url?.startsWith('/select/0/prometheus/api/v1/')) {
      queries.push({ path: req.url, form: new URLSearchParams(body) });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(queryError ? { status: 'error', error: 'bad query' } : response));
    } else {
      res.writeHead(404).end(`Unexpected path: ${req.url}`);
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const kubeconfig = JSON.stringify({
    apiVersion: 'v1',
    kind: 'Config',
    clusters: [{ name: 'fixture', cluster: { server: `${origin}/k8s` } }],
    users: [{ name: 'fixture', user: { token: 'fictional-test-token' } }],
    contexts: [
      { name: 'fixture', context: { cluster: 'fixture', user: 'fixture', namespace: 'demo' } }
    ],
    'current-context': 'fixture'
  });
  const config = {
    kubeconfig,
    metricsURL: `${origin}/select/0/prometheus`,
    whitelistKubernetesHosts: [`${origin}/k8s`]
  };
  return {
    client: new MetricsClient(config),
    config,
    queries,
    reviews,
    response,
    readyCount: () => readyRequests,
    readyStatus: (status: number) => {
      readyStatus = status;
    },
    failQuery: () => {
      queryError = true;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      })
  };
}

const latestQuery = (f: Awaited<ReturnType<typeof fixture>>) =>
  f.queries.at(-1)!.form.get('query')!;

test('legacy DevBox CPU query preserves names, scoped VM URL, ranges and auth cache', async () => {
  const f = await fixture();
  try {
    const params = {
      type: 'cpu' as const,
      podName: 'my-app-hash-pod',
      range: { start: 0, end: 60, step: '1m' }
    };
    const result = await f.client.launchpad.query(params);
    assert.deepEqual(result, f.response);
    assert.equal(f.queries[0].path, '/select/0/prometheus/api/v1/query_range');
    assert.equal(f.queries[0].form.get('start'), '0');
    assert.equal(f.queries[0].form.get('step'), '1m');
    assert.match(latestQuery(f), /pod=~"my-app-hash\.\*"/);
    assert.match(latestQuery(f), /namespace=~"demo"/);
    await Promise.all([f.client.launchpad.query(params), f.client.launchpad.query(params)]);
    assert.equal(f.readyCount(), 1);
    assert.equal(f.reviews.length, 1);
    assert.equal(f.reviews[0].authorization, 'Bearer fictional-test-token');
  } finally {
    await f.close();
  }
});

test('application memory uses corrected recording rule; bare pod names retain their prefix', async () => {
  const f = await fixture();
  try {
    for (const type of ['memory', 'average_memory'] as const) {
      await f.client.launchpad.query({ type, podName: 'app', range: { time: 0 } });
      assert.match(
        latestQuery(f),
        /node_namespace_pod_container:container_memory_working_set_bytes/
      );
      assert.match(latestQuery(f), /container!="",image!=""/);
      assert.match(latestQuery(f), /pod=~"app\.\*"/);
      assert.equal(f.queries.at(-1)!.form.get('time'), '0');
      assert.equal(f.queries.at(-1)!.path, '/select/0/prometheus/api/v1/query');
    }
  } finally {
    await f.close();
  }
});

test('disk and storage are aliases and PVC queries do not require a Pod', async () => {
  const f = await fixture();
  try {
    await f.client.launchpad.query({ type: 'disk', pvcName: 'data-app-0' });
    const disk = latestQuery(f);
    await f.client.launchpad.query({ type: 'storage', pvcName: 'data-app-0' });
    assert.equal(latestQuery(f), disk);
    assert.match(disk, /persistentvolumeclaim=~"data-app-0"/);
  } finally {
    await f.close();
  }
});

test('GPU and network metrics retain Go service semantics and scope short services', async () => {
  const f = await fixture();
  try {
    await f.client.launchpad.query({ type: 'gpu', podName: 'app-hash-pod' });
    assert.match(
      latestQuery(f),
      /Device_utilization_desc_of_container\{podnamespace=~"demo",podname=~"app-hash\.\*"\}/
    );
    await f.client.launchpad.query({ type: 'gpu_memory', podName: 'app-hash-pod' });
    assert.match(latestQuery(f), /sum without\(data\) \(Device_memory_desc_of_container/);
    for (const [type, metric] of [
      ['network_service_request_count', 'envoy_cluster_upstream_rq'],
      ['network_service_request_percent', 'envoy_upstream_request_percentage']
    ] as const) {
      await f.client.launchpad.query({ type, service: 'web', port: 8080 });
      assert.equal(
        latestQuery(f),
        `${metric}{cluster_name="outbound|8080||web.demo.svc.cluster.local"}`
      );
      await f.client.launchpad.query({ type, service: 'web.demo.svc.cluster.local', port: '8080' });
      assert.equal(
        latestQuery(f),
        `${metric}{cluster_name="outbound|8080||web.demo.svc.cluster.local"}`
      );
    }
  } finally {
    await f.close();
  }
});

test('invalid launchpad parameters fail before auth or metrics I/O', async () => {
  const f = await fixture();
  try {
    const bad = [
      [{ type: 'bogus' }, /Unsupported launchpad/],
      [{ type: 'constructor' }, /Unsupported launchpad/],
      [{ type: 'cpu' }, /podName/],
      [{ type: 'disk' }, /pvcName/],
      [{ type: 'network_service_request_count', service: 'web' }, /valid port/],
      [{ type: 'network_service_request_count', port: 80 }, /service is required/],
      [{ type: 'network_service_request_count', port: 65536, service: 'web' }, /valid port/],
      [
        { type: 'network_service_request_count', port: 80, service: 'web.other.svc.cluster.local' },
        /authenticated namespace/
      ]
    ] as const;
    for (const [params, error] of bad) {
      await assert.rejects(f.client.launchpad.query(params as never), error);
    }
    assert.equal(f.readyCount(), 0);
    assert.equal(f.queries.length, 0);
  } finally {
    await f.close();
  }
});

test('database templates, legacy raw query and MinIO remain available', async () => {
  const f = await fixture();
  try {
    for (const type of [
      'apecloud-mysql',
      'mysql',
      'postgresql',
      'mongodb',
      'redis',
      'kafka',
      'milvus'
    ] as const) {
      await f.client.database.query({ type, app: 'my-db', query: 'cpu' });
      assert.match(latestQuery(f), /namespace=~"demo"/);
      assert.match(latestQuery(f), /my-db/);
      assert.doesNotMatch(latestQuery(f), /[#@]/);
    }
    await f.client.database.query({ type: 'apecloud-mysql', app: 'my-db', query: 'connections' });
    assert.match(latestQuery(f), /workloads_kubeblocks_io_instance=~"my-db"/);
    await f.client.database.rawQuery({
      query: 'sum(rate(mysql_global_status_commands_total{$,app="db"}[1m]))'
    });
    assert.equal(
      latestQuery(f),
      'sum(rate(mysql_global_status_commands_total{namespace="demo",app="db"}[1m]))'
    );
    await f.client.raw.query({ query: 'up', injectNamespace: false });
    assert.equal(latestQuery(f), 'up');
    const minio = new MetricsClient({ ...f.config, minioInstance: 'minio-fixture' });
    await minio.minio.query({ app: 'fictional-bucket', query: 'minio_bucket_usage_total_bytes' });
    assert.equal(
      latestQuery(f),
      'minio_bucket_usage_total_bytes{bucket="fictional-bucket", instance="minio-fixture"}'
    );
    await assert.rejects(
      f.client.database.query({ type: 'redis', app: 'db', query: 'constructor' }),
      /Unsupported query/
    );
    await assert.rejects(
      f.client.database.query({ type: 'constructor', app: 'db', query: 'cpu' } as never),
      /Unsupported database/
    );
    await assert.rejects(
      minio.minio.query({ app: 'fictional-bucket', query: 'constructor' } as never),
      /Unsupported MinIO query/
    );
  } finally {
    await f.close();
  }
});

test('namespace injection preserves quoted braces, regex quantifiers and capture replacements', () => {
  const q =
    'label_replace(rate(metric{$,path=~"a{1,3}",note="namespace=other"}[1m]), "dst", "$1", "src", "(.*)")';
  assert.equal(
    injectNamespace(q, 'demo'),
    'label_replace(rate(metric{namespace="demo",path=~"a{1,3}",note="namespace=other"}[1m]), "dst", "$1", "src", "(.*)")'
  );
  assert.equal(
    injectNamespace('up{} + other{job="a"}', 'demo'),
    'up{namespace="demo"} + other{namespace="demo",job="a"}'
  );
  assert.equal(injectNamespace('up{namespace=~"demo",$}', 'demo'), 'up{namespace=~"demo"}');
  assert.throws(() => injectNamespace('up{namespace="other"}', 'demo'), /authenticated namespace/);
  assert.throws(() => injectNamespace('up{namespace=~".*"}', 'demo'), /authenticated namespace/);
  assert.throws(() => injectNamespace('up{', 'demo'), /Unclosed/);
});

test('permission denial is cached per client and namespace and never queries metrics', async () => {
  const f = await fixture();
  try {
    const params = { namespace: 'denied', type: 'cpu' as const, podName: 'app' };
    await assert.rejects(f.client.launchpad.query(params), /No permission/);
    await assert.rejects(f.client.launchpad.query(params), /No permission/);
    assert.equal(f.reviews.length, 1);
    assert.equal(f.queries.length, 0);
    await f.client.launchpad.query({ ...params, namespace: 'demo' });
    assert.equal(f.reviews.length, 2);
    const other = new MetricsClient(f.config);
    await other.launchpad.query({ ...params, namespace: 'demo' });
    assert.equal(f.reviews.length, 3);
  } finally {
    await f.close();
  }
});

test('concurrent auth checks are coalesced and disabled cache revalidates', async () => {
  const f = await fixture();
  try {
    await Promise.all(
      Array.from({ length: 4 }, () => f.client.launchpad.query({ type: 'cpu', podName: 'app' }))
    );
    assert.equal(f.reviews.length, 1);
    const uncached = new MetricsClient({ ...f.config, authCacheTTL: 0 });
    for (let i = 0; i < 2; i++) await uncached.launchpad.query({ type: 'cpu', podName: 'app' });
    assert.equal(f.reviews.length, 3);
  } finally {
    await f.close();
  }
});

test('non-200 readiness and 200 Prometheus errors are rejected', async () => {
  const f = await fixture();
  try {
    f.readyStatus(403);
    await assert.rejects(
      f.client.launchpad.query({ type: 'cpu', podName: 'app' }),
      /ping apiserver/
    );
    assert.equal(f.reviews.length, 0);
    assert.equal(f.queries.length, 0);
    f.readyStatus(200);
    f.failQuery();
    await assert.rejects(f.client.launchpad.query({ type: 'cpu', podName: 'app' }), /bad query/);
  } finally {
    await f.close();
  }
});

test('empty credentials and invalid namespace fail clearly', () => {
  assert.throws(() => new MetricsClient({ kubeconfig: '' }), /kubeconfig is required/);
  const auth = new AuthService('unused');
  assert.equal(auth.resolveNamespace(' demo '), 'demo');
  assert.throws(() => auth.resolveNamespace('other|demo'), /Invalid namespace/);
});
