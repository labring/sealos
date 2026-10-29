const { unusedDb, kube } = vi.hoisted(() => ({
  unusedDb: {},
  kube: { deploymentRegion: vi.fn(), workspaceResourceReader: vi.fn() }
}));
vi.mock('@/services/backend/db/init', () => ({ globalPrisma: unusedDb }));
vi.mock('@/services/backend/acquisition/deployment-operations/kubernetes', () => kube);
import { createNativeDeploymentService } from '@/services/backend/acquisition/deployment-operations/service';
import {
  OPERATION_ANNOTATION,
  ready,
  registrationSchema,
  snapshot,
  verifyResource
} from '@/services/backend/acquisition/deployment-operations/proof';
import type { DeploymentActor } from '@/services/backend/acquisition/deployment-operations/kubernetes';

const ACTOR: DeploymentActor = {
  userUid: 'f52e329e-43c7-442f-a556-fd17f870042e',
  realm: 'global',
  regionUid: 'd87c36d8-3f12-4f14-a470-31201d12fbaa',
  regionDomain: 'usw-1.sealos.io'
};
const ID = 'a69cb18c-e42b-456b-bb57-20ef42bce8a4';
const MARKER = 'server-issued-operation-marker';
const REF = {
  api_version: 'apps/v1',
  kind: 'Deployment' as const,
  name: 'demo',
  namespace: 'ns-test'
};
const START = new Date('2026-10-29T02:00:00Z');
const PLAN = {
  version: 1,
  operation_id: ID,
  workspace_id: 'ns-test',
  region_domain: ACTOR.regionDomain,
  resources: [REF]
};
function workload(overrides: Record<string, any> = {}) {
  return {
    metadata: {
      uid: 'new-resource-uid',
      generation: 1,
      resourceVersion: '7',
      creationTimestamp: '2026-10-29T02:00:01Z',
      annotations: { [OPERATION_ANNOTATION]: MARKER }
    },
    spec: {
      replicas: 1,
      template: { spec: { containers: [{ name: 'app', image: 'example:v2' }] } }
    },
    status: {
      observedGeneration: 1,
      replicas: 1,
      updatedReplicas: 1,
      readyReplicas: 1,
      availableReplicas: 1
    },
    ...overrides
  };
}
function matches(row: any, where: any): boolean {
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (key === 'OR') return value.some((part: any) => matches(row, part));
    const actual = row[key];
    if (value instanceof Date) return actual?.getTime() === value.getTime();
    if (value && typeof value === 'object') {
      return Object.entries(value).every(([operator, target]: [string, any]) => {
        if (operator === 'in') return target.includes(actual);
        if (operator === 'not') return actual !== target;
        if (operator === 'equals')
          return actual instanceof Date ? actual.getTime() === target.getTime() : actual === target;
        if (operator === 'gt') return actual > target;
        if (operator === 'lt') return actual < target;
        if (operator === 'lte') return actual <= target;
        return false;
      });
    }
    return actual === value;
  });
}
function harness() {
  const operations: any[] = [];
  const receipts: any[] = [];
  const events: any[] = [];
  const resources = new Map<string, any>();
  let allowed = true;
  let current = START;
  const db: any = {
    nativeDeploymentOperation: {
      findUnique: vi.fn(
        async ({ where }: any) => operations.find((row) => matches(row, where)) ?? null
      ),
      findMany: vi.fn(async ({ where, take }: any) =>
        operations.filter((row) => matches(row, where)).slice(0, take)
      ),
      create: vi.fn(async ({ data }: any) => {
        const row = {
          ...data,
          status: 'REGISTERED',
          completionRequestedAt: null,
          leaseUntil: null,
          lastCheck: null,
          completedAt: null,
          eventId: null
        };
        operations.push(row);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of operations.filter((row) => matches(row, where))) {
          Object.assign(row, data);
          count++;
        }
        return { count };
      })
    },
    nativeDeploymentReceipt: {
      findMany: vi.fn(async ({ where }: any) => receipts.filter((row) => matches(row, where))),
      createMany: vi.fn(async ({ data }: any) => {
        for (const row of data) {
          if (receipts.some((prior) => prior.proofId === row.proofId))
            throw Object.assign(new Error('duplicate proof'), { code: 'P2002' });
        }
        receipts.push(...data);
        return { count: data.length };
      })
    },
    productAnalyticsEvent: {
      upsert: vi.fn(async ({ where, create }: any) => {
        const previous = events.find((row) => row.eventId === where.eventId);
        if (previous) return previous;
        events.push(create);
        return create;
      })
    }
  };
  db.$transaction = async (run: any) => {
    const backup = structuredClone({ operations, receipts, events });
    try {
      return await run(db);
    } catch (error) {
      operations.splice(0, operations.length, ...backup.operations);
      receipts.splice(0, receipts.length, ...backup.receipts);
      events.splice(0, events.length, ...backup.events);
      throw error;
    }
  };
  const reader = vi.fn(async (ref: any) => structuredClone(resources.get(ref.name) ?? null));
  const readerForActor = vi.fn(async () => {
    if (!allowed) throw new Error('membership revoked');
    return reader;
  });
  const service = createNativeDeploymentService({
    db,
    readerForActor,
    now: () => current,
    marker: () => MARKER
  });
  return {
    service,
    operations,
    receipts,
    events,
    resources,
    readerForActor,
    reader,
    db,
    setAllowed: (value: boolean) => {
      allowed = value;
    },
    setTime: (value: Date) => {
      current = value;
    }
  };
}
beforeEach(() => {
  vi.stubEnv('ACQUISITION_REALM', 'global');
  kube.deploymentRegion.mockReturnValue({
    regionUid: ACTOR.regionUid,
    regionDomain: ACTOR.regionDomain
  });
});
afterEach(() => vi.unstubAllEnvs());

it('registers before apply and creates one durable success only after complete verifies the whole plan', async () => {
  const h = harness();
  const registered = await h.service.register(ACTOR, PLAN);
  expect(registered).toEqual({
    operation_id: ID,
    operation_marker: MARKER,
    expires_at: '2026-10-29T02:30:00.000Z'
  });
  h.resources.set('demo', workload());
  // Registration alone must never admit asynchronous completion.
  await h.service.reconcile();
  expect(h.events).toHaveLength(0);
  expect(h.operations[0].completionRequestedAt).toBeNull();
  h.setTime(new Date('2026-10-29T02:00:10Z'));
  expect(await h.service.complete(ACTOR, ID)).toEqual({ operation_id: ID, status: 'completed' });
  expect(h.events).toHaveLength(1);
  expect(h.events[0].payload.event).toMatchObject({
    subject_id: ACTOR.userUid,
    workspace_id: 'ns-test',
    event_name: 'deploy_success',
    properties: { deployment_id: ID, actor_id: ACTOR.userUid }
  });
  expect(h.receipts).toHaveLength(1);
  expect(await h.service.complete(ACTOR, ID)).toEqual({ operation_id: ID, status: 'completed' });
  expect(h.events).toHaveLength(1);
  expect(JSON.stringify(h.operations)).not.toContain('example:v2');
});

it.each([
  ['old Ready', workload()],
  [
    'wrong marker',
    workload({
      metadata: { ...workload().metadata, annotations: { [OPERATION_ANNOTATION]: 'wrong' } }
    })
  ],
  [
    'stale generation',
    workload({
      metadata: { ...workload().metadata, generation: 2 },
      status: { ...workload().status, observedGeneration: 1 }
    })
  ]
])('does not trust %s or a client-side success claim', async (_label, after) => {
  const h = harness();
  if (_label === 'old Ready') h.resources.set('demo', after);
  await h.service.register(ACTOR, PLAN);
  h.resources.set('demo', after);
  expect((await h.service.complete(ACTOR, ID)).status).toBe('pending');
  expect(h.events).toHaveLength(0);
});

it('rejects marker-only changes and accepts a real current-generation desired change', async () => {
  const h = harness();
  const previous = workload({
    metadata: {
      ...workload().metadata,
      uid: 'stable-uid',
      creationTimestamp: '2026-10-28T00:00:00Z'
    }
  });
  h.resources.set('demo', previous);
  await h.service.register(ACTOR, PLAN);
  const next = workload({
    metadata: { ...previous.metadata, generation: 2, resourceVersion: '8' },
    status: { ...previous.status, observedGeneration: 2 }
  });
  h.resources.set('demo', next);
  expect((await h.service.complete(ACTOR, ID)).status).toBe('pending');
  next.spec.template.spec.containers[0].image = 'example:v3';
  h.resources.set('demo', next);
  expect((await h.service.complete(ACTOR, ID)).status).toBe('completed');
  expect(h.events).toHaveLength(1);
});

it('leaves a partial plan pending and cron verifies it only after completion admission', async () => {
  const h = harness();
  const second = { ...REF, name: 'second' };
  await h.service.register(ACTOR, { ...PLAN, resources: [REF, second] });
  h.resources.set('demo', workload());
  expect((await h.service.complete(ACTOR, ID)).status).toBe('pending');
  expect(h.events).toHaveLength(0);
  h.resources.set('second', workload({ metadata: { ...workload().metadata, uid: 'second-uid' } }));
  expect(await h.service.reconcile()).toEqual({ examined: 1, completed: 1 });
  expect(h.receipts).toHaveLength(2);
  expect(h.events).toHaveLength(1);
});

it('rejects another account/region, revoked membership and immutable-plan mutation', async () => {
  const h = harness();
  await h.service.register(ACTOR, PLAN);
  await expect(
    h.service.complete({ ...ACTOR, userUid: 'different-account' }, ID)
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    h.service.complete({ ...ACTOR, regionUid: 'different-region' }, ID)
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    h.service.register(ACTOR, { ...PLAN, region_domain: 'other.sealos.io' })
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    h.service.register(ACTOR, { ...PLAN, resources: [{ ...REF, name: 'other' }] })
  ).rejects.toMatchObject({ status: 409 });
  h.setAllowed(false);
  await expect(h.service.complete(ACTOR, ID)).rejects.toThrow('membership revoked');
  expect(h.operations[0].completionRequestedAt).toBeNull();
  expect(h.events).toHaveLength(0);
});

it('reuses the original baseline/marker on registration retries and cannot refresh an expired operation', async () => {
  const h = harness();
  const first = await h.service.register(ACTOR, PLAN);
  h.resources.set('demo', workload());
  expect(await h.service.register(ACTOR, PLAN)).toEqual(first);
  expect(h.operations[0].baselines[0].before).toBeNull();
  h.setTime(new Date('2026-10-29T02:31:00Z'));
  await expect(h.service.register(ACTOR, PLAN)).rejects.toMatchObject({ status: 410 });
  expect((await h.service.complete(ACTOR, ID)).status).toBe('expired');
  expect(h.events).toHaveLength(0);
});

it('consumes a UID/generation receipt once even when two operations observed the same pre-apply state', async () => {
  const h = harness();
  const secondId = 'b4a218ef-6246-4108-9d1e-8b61548535b1';
  await h.service.register(ACTOR, PLAN);
  await h.service.register(ACTOR, { ...PLAN, operation_id: secondId });
  h.resources.set('demo', workload());
  expect((await h.service.complete(ACTOR, ID)).status).toBe('completed');
  expect((await h.service.complete(ACTOR, secondId)).status).toBe('duplicate');
  expect(h.events).toHaveLength(1);
  expect(h.receipts).toHaveLength(1);
});

it('checks exact kind/version, Workspace namespace, all-plan uniqueness and forbids secret references', () => {
  for (const resources of [
    [{ ...REF, kind: 'Secret', api_version: 'v1' }],
    [{ ...REF, namespace: 'ns-other' }],
    [{ ...REF, api_version: 'apps/v1beta1' }],
    [REF, REF]
  ]) {
    expect(registrationSchema.safeParse({ ...PLAN, resources }).success).toBe(false);
  }
});

it('accepts a current KubeBlocks generation but never treats bucket status.name as full-plan Ready', () => {
  const cluster = { ...REF, kind: 'Cluster' as const, api_version: 'apps.kubeblocks.io/v1alpha1' };
  expect(ready(cluster, workload({ status: { observedGeneration: 1, phase: 'Running' } }), 1)).toBe(
    true
  );
  expect(ready(cluster, workload({ status: { observedGeneration: 0, phase: 'Running' } }), 1)).toBe(
    false
  );
  const bucket = {
    ...REF,
    kind: 'ObjectStorageBucket' as const,
    api_version: 'objectstorage.sealos.io/v1'
  };
  expect(ready(bucket, workload({ status: { name: 'created-bucket' } }), 1)).toBe(false);
  expect(
    ready(
      bucket,
      workload({
        status: { conditions: [{ type: 'Ready', status: 'True', observedGeneration: 1 }] }
      }),
      1
    )
  ).toBe(true);
});

it('does not hash the attribution marker as a desired change, including a nested Pod template annotation', () => {
  const before = workload();
  const after = structuredClone(before);
  (after.spec.template as any).metadata = {
    annotations: { [OPERATION_ANNOTATION]: 'other-marker' }
  };
  // Keep every real desired field equal; marker is ignored at every annotation level.
  (before.spec.template as any).metadata = { annotations: { [OPERATION_ANNOTATION]: MARKER } };
  expect(snapshot(before).specHash).toBe(snapshot(after).specHash);
  expect(
    verifyResource({
      baseline: { ref: REF, before: null },
      current: workload({
        metadata: { ...workload().metadata, creationTimestamp: '2026-10-28T00:00:00Z' }
      }),
      marker: MARKER,
      registeredAt: START
    }).ok
  ).toBe(false);
});

it('does not let a slow verifier complete after its lease expires, even without a competing owner', async () => {
  const h = harness();
  await h.service.register(ACTOR, PLAN);
  h.reader.mockImplementation(async () => {
    h.setTime(new Date(START.getTime() + 31_000));
    return workload();
  });
  expect((await h.service.complete(ACTOR, ID)).status).toBe('pending');
  expect(h.events).toHaveLength(0);
  expect(h.receipts).toHaveLength(0);
  expect((await h.service.complete(ACTOR, ID)).status).toBe('completed');
  expect(h.events).toHaveLength(1);
});

it('compares Kubernetes creation timestamps at their actual second precision, without broad clock-skew allowance', () => {
  const registeredAt = new Date('2026-10-29T02:00:00.900Z');
  const sameSecond = workload({
    metadata: { ...workload().metadata, creationTimestamp: '2026-10-29T02:00:00Z' }
  });
  expect(
    verifyResource({
      baseline: { ref: REF, before: null },
      current: sameSecond,
      marker: MARKER,
      registeredAt
    }).ok
  ).toBe(true);
  const previousSecond = workload({
    metadata: { ...workload().metadata, creationTimestamp: '2026-10-29T01:59:59Z' }
  });
  expect(
    verifyResource({
      baseline: { ref: REF, before: null },
      current: previousSecond,
      marker: MARKER,
      registeredAt
    }).ok
  ).toBe(false);
});

it('ignores marker-only creation of otherwise absent nested metadata and annotations maps', () => {
  const before = workload();
  const after = structuredClone(before);
  (after.spec.template as any).metadata = { annotations: { [OPERATION_ANNOTATION]: MARKER } };
  expect(snapshot(before).specHash).toBe(snapshot(after).specHash);
});
