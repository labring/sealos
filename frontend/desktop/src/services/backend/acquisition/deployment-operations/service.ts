import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { NativeDeploymentOperation, Prisma } from 'prisma/global/generated/client';
import { globalPrisma } from '@/services/backend/db/init';
import { AcquisitionError, realm } from '../config';
import {
  deploymentRegion,
  workspaceResourceReader,
  type DeploymentActor,
  type ResourceReader
} from './kubernetes';
import {
  digest,
  planHash,
  registrationSchema,
  resourceKey,
  resourceRefSchema,
  snapshot,
  verifyResource,
  type ResourceBaseline
} from './proof';

const OPERATION_TTL_MS = 30 * 60_000;
const LEASE_MS = 30_000;
const persistedBaselineSchema = z
  .array(
    z.object({
      ref: resourceRefSchema,
      before: z
        .object({
          uid: z.string().min(1),
          generation: z.number().int().nonnegative(),
          resourceVersion: z.string().min(1),
          createdAt: z.string().datetime(),
          specHash: z.string().regex(/^[a-f0-9]{64}$/)
        })
        .nullable()
    })
  )
  .min(1)
  .max(10);

type Dependencies = {
  db?: typeof globalPrisma;
  readerForActor?: (actor: DeploymentActor, workspaceId: string) => Promise<ResourceReader>;
  now?: () => Date;
  marker?: () => string;
};
function owned(operation: NativeDeploymentOperation, actor: DeploymentActor) {
  if (
    operation.userUid !== actor.userUid ||
    operation.realm !== actor.realm ||
    operation.regionUid !== actor.regionUid ||
    operation.regionDomain !== actor.regionDomain
  )
    throw new AcquisitionError(403, 'Operation does not belong to this account or resource region');
}
function result(operationId: string, status: string) {
  return { operation_id: operationId, status: status.toLowerCase() };
}

export function createNativeDeploymentService(options: Dependencies = {}) {
  const db = options.db ?? globalPrisma;
  const readerForActor = options.readerForActor ?? workspaceResourceReader;
  const now = options.now ?? (() => new Date());
  const marker = options.marker ?? (() => randomBytes(32).toString('hex'));

  async function register(actor: DeploymentActor, input: unknown) {
    const parsed = registrationSchema.safeParse(input);
    if (!parsed.success) throw new AcquisitionError(400, 'Invalid deployment proof plan');
    const plan = parsed.data;
    if (plan.region_domain && plan.region_domain !== actor.regionDomain)
      throw new AcquisitionError(403, 'Wrong resource region');
    const reader = await readerForActor(actor, plan.workspace_id);
    const previous = await db.nativeDeploymentOperation.findUnique({
      where: { operationId: plan.operation_id }
    });
    if (previous) {
      owned(previous, actor);
      if (previous.planHash !== planHash(plan))
        throw new AcquisitionError(409, 'Operation plan is immutable');
      if (previous.expiresAt <= now()) throw new AcquisitionError(410, 'Operation expired');
      return {
        operation_id: previous.operationId,
        operation_marker: previous.marker,
        expires_at: previous.expiresAt.toISOString()
      };
    }
    const registeredAt = now();
    const refs = [...plan.resources].sort((a, b) => resourceKey(a).localeCompare(resourceKey(b)));
    const baselines: ResourceBaseline[] = await Promise.all(
      refs.map(async (ref) => {
        const before = await reader(ref);
        return { ref, before: before ? snapshot(before) : null };
      })
    );
    try {
      const operation = await db.nativeDeploymentOperation.create({
        data: {
          operationId: plan.operation_id,
          userUid: actor.userUid,
          realm: actor.realm,
          regionUid: actor.regionUid,
          regionDomain: actor.regionDomain,
          workspaceId: plan.workspace_id,
          marker: marker(),
          planHash: planHash(plan),
          baselines: baselines as Prisma.InputJsonValue,
          registeredAt,
          expiresAt: new Date(registeredAt.getTime() + OPERATION_TTL_MS)
        }
      });
      return {
        operation_id: operation.operationId,
        operation_marker: operation.marker,
        expires_at: operation.expiresAt.toISOString()
      };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new AcquisitionError(409, 'Operation registration already exists');
      throw error;
    }
  }

  async function verify(actor: DeploymentActor, operationId: string, admit: boolean) {
    const operation = await db.nativeDeploymentOperation.findUnique({ where: { operationId } });
    if (!operation) throw new AcquisitionError(404, 'Operation not found');
    owned(operation, actor);
    // Recheck membership on both the interactive and cron path; no saved kubeconfig is reused.
    const reader = await readerForActor(actor, operation.workspaceId);
    if (operation.status !== 'REGISTERED') return result(operationId, operation.status);
    if (operation.expiresAt <= now()) {
      await db.nativeDeploymentOperation.updateMany({
        where: { operationId, status: 'REGISTERED' },
        data: { status: 'EXPIRED', lastCheck: 'operation_expired', leaseUntil: null }
      });
      return result(operationId, 'EXPIRED');
    }
    if (admit && !operation.completionRequestedAt) {
      await db.nativeDeploymentOperation.updateMany({
        where: { operationId, status: 'REGISTERED', completionRequestedAt: null },
        data: { completionRequestedAt: now() }
      });
    } else if (!admit && !operation.completionRequestedAt) return result(operationId, 'PENDING');
    const verificationLease = new Date(now().getTime() + LEASE_MS);
    const claimed = await db.nativeDeploymentOperation.updateMany({
      where: {
        operationId,
        status: 'REGISTERED',
        expiresAt: { gt: now() },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now() } }]
      },
      data: { leaseUntil: verificationLease }
    });
    if (claimed.count !== 1) return result(operationId, 'PENDING');
    try {
      const baselines = persistedBaselineSchema.parse(operation.baselines);
      const proofs = await Promise.all(
        baselines.map(async (baseline) => {
          return verifyResource({
            baseline,
            current: await reader(baseline.ref),
            marker: operation.marker,
            registeredAt: operation.registeredAt
          });
        })
      );
      const incomplete = proofs.find((proof) => !proof.ok);
      if (incomplete && !incomplete.ok) {
        await db.nativeDeploymentOperation.updateMany({
          where: { operationId, status: 'REGISTERED', leaseUntil: verificationLease },
          data: { leaseUntil: null, lastCheck: incomplete.reason }
        });
        return result(operationId, 'PENDING');
      }
      const proofIds = proofs
        .map((proof) => {
          if (!proof.ok) throw new Error('Unverified proof');
          return digest({
            realm: actor.realm,
            region: actor.regionUid,
            uid: proof.after.uid,
            generation: proof.after.generation
          });
        })
        .sort();
      const eventId = `native-deployment:${operationId}`;
      return await db.$transaction(async (tx) => {
        const consumed = await tx.nativeDeploymentReceipt.findMany({
          where: { proofId: { in: proofIds } }
        });
        const completedAt = now();
        if (verificationLease <= completedAt) return result(operationId, 'PENDING');
        const status = consumed.length > 0 ? 'DUPLICATE' : 'COMPLETED';
        const effectiveEventId = consumed[0]?.eventId ?? eventId;
        const transitioned = await tx.nativeDeploymentOperation.updateMany({
          where: {
            operationId,
            status: 'REGISTERED',
            userUid: actor.userUid,
            realm: actor.realm,
            regionUid: actor.regionUid,
            completionRequestedAt: { not: null },
            expiresAt: { gt: completedAt },
            leaseUntil: { equals: verificationLease, gt: completedAt }
          },
          data: {
            status,
            eventId: effectiveEventId,
            completedAt,
            leaseUntil: null,
            lastCheck: null
          }
        });
        if (transitioned.count !== 1) return result(operationId, 'PENDING');
        if (consumed.length > 0) return result(operationId, status);
        await tx.nativeDeploymentReceipt.createMany({
          data: proofIds.map((proofId) => ({
            proofId,
            operationId,
            userUid: actor.userUid,
            eventId
          }))
        });
        await tx.productAnalyticsEvent.upsert({
          where: { eventId: `lifecycle:${eventId}` },
          update: {},
          create: {
            eventId: `lifecycle:${eventId}`,
            subjectId: actor.userUid,
            realm: actor.realm,
            occurredAt: completedAt,
            payload: {
              kind: 'lifecycle',
              event: {
                version: 1,
                event_id: eventId,
                event_name: 'deploy_success',
                occurred_at: completedAt.toISOString(),
                subject_id: actor.userUid,
                realm: actor.realm,
                workspace_id: operation.workspaceId,
                properties: { deployment_id: operationId, actor_id: actor.userUid }
              }
            }
          }
        });
        return result(operationId, 'COMPLETED');
      });
    } catch (error) {
      await db.nativeDeploymentOperation.updateMany({
        where: { operationId, status: 'REGISTERED', leaseUntil: verificationLease },
        data: {
          leaseUntil: null,
          lastCheck:
            (error as { code?: string }).code === 'P2002'
              ? 'concurrent_proof_claim'
              : 'verification_unavailable'
        }
      });
      return result(operationId, 'PENDING');
    }
  }

  async function reconcile(limit = 5) {
    const region = deploymentRegion();
    await db.nativeDeploymentOperation.updateMany({
      where: {
        realm: realm(),
        regionUid: region.regionUid,
        status: 'REGISTERED',
        expiresAt: { lte: now() }
      },
      data: { status: 'EXPIRED', leaseUntil: null, lastCheck: 'operation_expired' }
    });
    const operations = await db.nativeDeploymentOperation.findMany({
      where: {
        realm: realm(),
        regionUid: region.regionUid,
        status: 'REGISTERED',
        completionRequestedAt: { not: null },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now() } }]
      },
      orderBy: { registeredAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 5)
    });
    let completed = 0;
    for (const operation of operations) {
      try {
        const response = await verify(
          {
            userUid: operation.userUid,
            realm: operation.realm as 'global' | 'china',
            regionUid: operation.regionUid,
            regionDomain: operation.regionDomain
          },
          operation.operationId,
          false
        );
        if (response.status === 'completed') completed++;
      } catch {
        // Permission loss never produces a conversion and never stalls the collector.
        await db.nativeDeploymentOperation.updateMany({
          where: { operationId: operation.operationId, status: 'REGISTERED' },
          data: { lastCheck: 'authorization_or_region_unavailable' }
        });
      }
    }
    return { examined: operations.length, completed };
  }
  return {
    register,
    complete: (actor: DeploymentActor, id: string) => verify(actor, id, true),
    reconcile
  };
}

export const nativeDeploymentService = createNativeDeploymentService();
export const reconcileNativeDeploymentOperations = (limit = 5) =>
  nativeDeploymentService.reconcile(limit);
