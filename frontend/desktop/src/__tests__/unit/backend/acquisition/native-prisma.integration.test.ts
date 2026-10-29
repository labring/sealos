import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from 'prisma/providers/postgresql/global/generated/client';

vi.mock('@/services/backend/db/init', () => ({ globalPrisma: {} }));
vi.mock('@/services/backend/acquisition/deployment-operations/kubernetes', () => ({
  deploymentRegion: () => ({
    regionUid: 'd87c36d8-3f12-4f14-a470-31201d12fbaa',
    regionDomain: 'usw-1.sealos.io'
  }),
  workspaceResourceReader: vi.fn()
}));
import { createNativeDeploymentService } from '@/services/backend/acquisition/deployment-operations/service';
import {
  OPERATION_ANNOTATION,
  type WorkloadObject
} from '@/services/backend/acquisition/deployment-operations/proof';

/** Never permit a production URL, tunnel identity or a caller-controlled search_path. */
function isolatedDatabaseURL(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      'NATIVE_PROOF_DATABASE_URL must target the dedicated native_proof_test database/user on localhost.'
    );
  }
  const hosts = ['localhost', '127.0.0.1', '[::1]'];
  if (
    !['postgresql:', 'postgres:'].includes(url.protocol) ||
    !hosts.includes(url.hostname) ||
    decodeURIComponent(url.username) !== 'native_proof_test' ||
    decodeURIComponent(url.pathname) !== '/native_proof_test' ||
    url.hash ||
    [...url.searchParams].some(([key, value]) => key !== 'sslmode' || value !== 'disable')
  )
    throw new Error(
      'NATIVE_PROOF_DATABASE_URL must target localhost and the dedicated native_proof_test database/user with no schema/host overrides.'
    );
  return url;
}
const ACTOR = {
  userUid: 'f52e329e-43c7-442f-a556-fd17f870042e',
  realm: 'global' as const,
  regionUid: 'd87c36d8-3f12-4f14-a470-31201d12fbaa',
  regionDomain: 'usw-1.sealos.io'
};
const REF = {
  api_version: 'apps/v1',
  kind: 'Deployment' as const,
  name: 'real-db-proof',
  namespace: 'ns-proof'
};
const plan = (id: string) => ({
  version: 1,
  operation_id: id,
  workspace_id: REF.namespace,
  region_domain: ACTOR.regionDomain,
  resources: [REF]
});
function readyWorkload(uid: string, marker: string, now: Date): WorkloadObject {
  return {
    metadata: {
      uid,
      generation: 1,
      resourceVersion: '10',
      creationTimestamp: now.toISOString(),
      annotations: { [OPERATION_ANNOTATION]: marker }
    },
    spec: {
      replicas: 1,
      template: { spec: { containers: [{ name: 'app', image: 'test-only:v1' }] } }
    },
    status: {
      observedGeneration: 1,
      replicas: 1,
      updatedReplicas: 1,
      readyReplicas: 1,
      availableReplicas: 1
    }
  };
}

it.each([
  'postgresql://native_proof_test:fixture@production.example/native_proof_test',
  'postgresql://postgres:fixture@127.0.0.1/native_proof_test',
  'postgresql://native_proof_test:fixture@localhost/production',
  'postgresql://native_proof_test:fixture@localhost/native_proof_test?host=production.example',
  'postgresql://native_proof_test:fixture@localhost/native_proof_test?schema=public'
])('rejects unsafe integration database configuration before any connection', (url) => {
  expect(() => isolatedDatabaseURL(url)).toThrow('dedicated native_proof_test');
});

it.skipIf(!process.env.NATIVE_PROOF_DATABASE_URL)(
  'applies the PG migrations and atomically deduplicates native proofs with a real Prisma database',
  async () => {
    const base = isolatedDatabaseURL(process.env.NATIVE_PROOF_DATABASE_URL!);
    const schema = `native_proof_${randomUUID().replaceAll('-', '')}`;
    // The identifier is generated here, never supplied by env or HTTP.
    expect(schema).toMatch(/^native_proof_[a-f0-9]{32}$/);
    const admin = new PrismaClient({ datasources: { db: { url: base.toString() } } });
    let client: PrismaClient | undefined;
    let createdSchema = false;
    try {
      await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      createdSchema = true;
      const scopedURL = new URL(base);
      scopedURL.searchParams.set('schema', schema);
      scopedURL.searchParams.set('connection_limit', '5');
      client = new PrismaClient({ datasources: { db: { url: scopedURL.toString() } } });
      const current = await client.$queryRawUnsafe<{ schema: string }[]>(
        'SELECT current_schema() AS "schema"'
      );
      expect(current[0]?.schema).toBe(schema);
      for (const migration of [
        '20261029000000_app_acquisition',
        '20261029010000_native_deployment_proof'
      ]) {
        const text = await readFile(
          new URL(
            `../../../../../prisma/providers/postgresql/global/migrations/${migration}/migration.sql`,
            import.meta.url
          ),
          'utf8'
        );
        // These two feature migrations contain only standalone table/index DDL.
        for (const statement of text
          .split(';')
          .map((sql) => sql.trim())
          .filter(Boolean))
          await client.$executeRawUnsafe(statement);
      }
      const isolatedClient = client;
      const db = isolatedClient as unknown as NonNullable<
        Parameters<typeof createNativeDeploymentService>[0]
      >['db'];
      const now = new Date();
      let workload: WorkloadObject | null = null;
      const service = createNativeDeploymentService({
        db,
        now: () => now,
        readerForActor: async () => async () => workload
      });
      const firstId = randomUUID();
      const secondId = randomUUID();
      const first = await service.register(ACTOR, plan(firstId));
      const second = await service.register(ACTOR, plan(secondId));
      workload = readyWorkload('persisted-workload-uid', first.operation_marker, now);
      const responses = await Promise.all([
        service.complete(ACTOR, firstId),
        service.complete(ACTOR, firstId)
      ]);
      expect(responses.some((value) => value.status === 'completed')).toBe(true);
      expect(await isolatedClient.nativeDeploymentReceipt.count()).toBe(1);
      expect(await isolatedClient.productAnalyticsEvent.count()).toBe(1);
      await service.complete(ACTOR, firstId);
      expect(await isolatedClient.productAnalyticsEvent.count()).toBe(1);
      workload.metadata!.annotations![OPERATION_ANNOTATION] = second.operation_marker;
      expect((await service.complete(ACTOR, secondId)).status).toBe('duplicate');
      expect(await isolatedClient.nativeDeploymentReceipt.count()).toBe(1);
      expect(await isolatedClient.productAnalyticsEvent.count()).toBe(1);
      const event = await isolatedClient.productAnalyticsEvent.findFirstOrThrow();
      expect(event.subjectId).toBe(ACTOR.userUid);
      expect(event.payload).toMatchObject({
        kind: 'lifecycle',
        event: {
          event_name: 'deploy_success',
          subject_id: ACTOR.userUid,
          workspace_id: REF.namespace
        }
      });
      const firstRow = await isolatedClient.nativeDeploymentOperation.findUniqueOrThrow({
        where: { operationId: firstId }
      });
      const duplicateRow = await isolatedClient.nativeDeploymentOperation.findUniqueOrThrow({
        where: { operationId: secondId }
      });
      expect(firstRow.status).toBe('COMPLETED');
      expect(duplicateRow.status).toBe('DUPLICATE');
      expect(duplicateRow.eventId).toBe(firstRow.eventId);

      // Two independent verifier transactions can observe successive marker patches
      // before either receipt commits. The unique receipt must roll back the loser.
      let raceReady = false;
      let emptyReceiptReads = 0;
      let releaseReaders!: () => void;
      const bothReaders = new Promise<void>((resolve) => {
        releaseReaders = resolve;
      });
      // Force both real SQL transactions to observe no receipt before either
      // INSERT. This tests the database's unique-constraint rollback, rather
      // than accidentally passing through serialized application-level reads.
      const raceDb = {
        nativeDeploymentOperation: isolatedClient.nativeDeploymentOperation,
        nativeDeploymentReceipt: isolatedClient.nativeDeploymentReceipt,
        productAnalyticsEvent: isolatedClient.productAnalyticsEvent,
        $transaction: (run: any) =>
          isolatedClient.$transaction(
            async (tx) =>
              run({
                nativeDeploymentOperation: tx.nativeDeploymentOperation,
                productAnalyticsEvent: tx.productAnalyticsEvent,
                nativeDeploymentReceipt: {
                  createMany: tx.nativeDeploymentReceipt.createMany.bind(
                    tx.nativeDeploymentReceipt
                  ),
                  findMany: async (args: any) => {
                    const rows = await tx.nativeDeploymentReceipt.findMany(args);
                    if (rows.length === 0) {
                      emptyReceiptReads++;
                      if (emptyReceiptReads === 2) releaseReaders();
                      await bothReaders;
                    }
                    return rows;
                  }
                }
              }),
            { timeout: 10_000 }
          )
      } as unknown as NonNullable<Parameters<typeof createNativeDeploymentService>[0]>['db'];
      const makeRacer = () => {
        let marker = '';
        const racer = createNativeDeploymentService({
          db: raceDb,
          now: () => now,
          readerForActor: async () => async () =>
            raceReady ? readyWorkload('second-persisted-workload-uid', marker, now) : null
        });
        return {
          racer,
          setMarker: (value: string) => {
            marker = value;
          }
        };
      };
      const a = makeRacer();
      const b = makeRacer();
      const aId = randomUUID();
      const bId = randomUUID();
      a.setMarker((await a.racer.register(ACTOR, plan(aId))).operation_marker);
      b.setMarker((await b.racer.register(ACTOR, plan(bId))).operation_marker);
      raceReady = true;
      const raced = await Promise.all([a.racer.complete(ACTOR, aId), b.racer.complete(ACTOR, bId)]);
      expect(raced.map((value) => value.status).sort()).toEqual(['completed', 'pending']);
      expect(emptyReceiptReads).toBe(2);
      const rolledBack = await isolatedClient.nativeDeploymentOperation.findFirstOrThrow({
        where: { operationId: { in: [aId, bId] }, status: 'REGISTERED' }
      });
      expect(rolledBack.lastCheck).toBe('concurrent_proof_claim');
      expect(rolledBack.completedAt).toBeNull();
      expect(rolledBack.eventId).toBeNull();
      await a.racer.complete(ACTOR, aId);
      await b.racer.complete(ACTOR, bId);
      expect(await isolatedClient.nativeDeploymentReceipt.count()).toBe(2);
      expect(await isolatedClient.productAnalyticsEvent.count()).toBe(2);
      const racers = await isolatedClient.nativeDeploymentOperation.findMany({
        where: { operationId: { in: [aId, bId] } }
      });
      expect(racers.map((row) => row.status).sort()).toEqual(['COMPLETED', 'DUPLICATE']);
    } finally {
      try {
        await client?.$disconnect();
      } finally {
        try {
          if (createdSchema) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
        } finally {
          await admin.$disconnect();
        }
      }
    }
  },
  30_000
);
