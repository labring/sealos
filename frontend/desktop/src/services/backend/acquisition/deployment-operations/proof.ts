import { createHash } from 'node:crypto';
import { z } from 'zod';

export const OPERATION_ANNOTATION = 'sealos.io/acquisition-operation';
const name = z
  .string()
  .min(1)
  .max(253)
  .regex(/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/);
export const resourceRefSchema = z
  .object({
    api_version: z.string().min(1).max(80),
    kind: z.enum(['Deployment', 'StatefulSet', 'Cluster', 'ObjectStorageBucket']),
    name,
    namespace: name
  })
  .strict()
  .superRefine((ref, ctx) => {
    const version =
      ref.kind === 'Deployment' || ref.kind === 'StatefulSet'
        ? 'apps/v1'
        : ref.kind === 'Cluster'
        ? 'apps.kubeblocks.io/v1alpha1'
        : 'objectstorage.sealos.io/v1';
    if (ref.api_version !== version)
      ctx.addIssue({ code: 'custom', message: 'Unsupported proof API version' });
  });
export const registrationSchema = z
  .object({
    version: z.literal(1),
    operation_id: z.string().uuid(),
    workspace_id: name,
    region_domain: z.string().min(1).max(253).optional(),
    resources: z.array(resourceRefSchema).min(1).max(10)
  })
  .strict()
  .superRefine((input, ctx) => {
    const refs = input.resources.map(resourceKey);
    if (new Set(refs).size !== refs.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate proof resource' });
    if (input.resources.some((ref) => ref.namespace !== input.workspace_id))
      ctx.addIssue({
        code: 'custom',
        message: 'Proof resources must belong to the verified Workspace'
      });
  });
export type ResourceRef = z.infer<typeof resourceRefSchema>;
export type Registration = z.infer<typeof registrationSchema>;
export type WorkloadObject = {
  metadata?: {
    uid?: string;
    generation?: number;
    resourceVersion?: string;
    creationTimestamp?: string | Date;
    deletionTimestamp?: unknown;
    annotations?: Record<string, string>;
  };
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
};
export type ResourceSnapshot = {
  uid: string;
  generation: number;
  resourceVersion: string;
  createdAt: string;
  specHash: string;
};
export type ResourceBaseline = { ref: ResourceRef; before: ResourceSnapshot | null };

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value != null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([key]) => key !== OPERATION_ANNOTATION)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => [key, canonical(entry)] as const)
      .filter(([, entry]) => entry !== undefined);
    // 只新增归因 annotation 时，不能由留下的空 metadata/annotations 容器伪造 spec 变更。
    return entries.length === 0 ? undefined : Object.fromEntries(entries);
  }
  return value;
}
export function digest(value: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value) ?? null))
    .digest('hex');
}
export function resourceKey(ref: ResourceRef) {
  return `${ref.api_version}/${ref.kind}/${ref.namespace}/${ref.name}`;
}
export function snapshot(resource: WorkloadObject): ResourceSnapshot {
  const meta = resource.metadata;
  const created = meta?.creationTimestamp ? new Date(meta.creationTimestamp) : null;
  if (
    !meta?.uid ||
    !meta.resourceVersion ||
    !created ||
    !Number.isFinite(created.getTime()) ||
    !resource.spec
  )
    throw new Error('Incomplete workload metadata');
  return {
    uid: meta.uid,
    generation: meta.generation ?? 1,
    resourceVersion: meta.resourceVersion,
    createdAt: created.toISOString(),
    specHash: digest(resource.spec)
  };
}
function positive(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
export function ready(ref: ResourceRef, resource: WorkloadObject, generation: number): boolean {
  if (resource.metadata?.deletionTimestamp) return false;
  const status = resource.status ?? {};
  const conditions = Array.isArray(status.conditions)
    ? (status.conditions as { type?: string; status?: string; observedGeneration?: number }[])
    : [];
  const observed = positive(status.observedGeneration, -1);
  if (ref.kind === 'ObjectStorageBucket') {
    return conditions.some(
      (condition) =>
        condition.type === 'Ready' &&
        condition.status === 'True' &&
        positive(condition.observedGeneration, observed) >= generation
    );
  }
  if (observed < generation) return false;
  if (ref.kind === 'Cluster') return status.phase === 'Running';
  const replicas = positive(resource.spec?.replicas, 1);
  if (
    replicas < 1 ||
    positive(status.readyReplicas) !== replicas ||
    positive(status.updatedReplicas) !== replicas ||
    positive(status.replicas) !== replicas
  )
    return false;
  if (ref.kind === 'StatefulSet')
    return (
      typeof status.currentRevision === 'string' &&
      status.currentRevision !== '' &&
      status.currentRevision === status.updateRevision
    );
  return positive(status.availableReplicas) === replicas;
}
export function verifyResource(input: {
  baseline: ResourceBaseline;
  current: WorkloadObject | null;
  marker: string;
  registeredAt: Date;
}) {
  const { baseline, current, marker, registeredAt } = input;
  if (!current) return { ok: false as const, reason: 'resource_missing' };
  if (current.metadata?.annotations?.[OPERATION_ANNOTATION] !== marker)
    return { ok: false as const, reason: 'operation_marker_mismatch' };
  const after = snapshot(current);
  const before = baseline.before;
  if (before?.uid === after.uid) {
    if (
      after.generation <= before.generation ||
      after.specHash === before.specHash ||
      after.resourceVersion === before.resourceVersion
    )
      return { ok: false as const, reason: 'no_desired_change' };
  } else if (
    Math.floor(new Date(after.createdAt).getTime() / 1000) <
    Math.floor(registeredAt.getTime() / 1000)
  )
    return { ok: false as const, reason: 'resource_predates_operation' };
  if (!ready(baseline.ref, current, after.generation))
    return { ok: false as const, reason: 'current_generation_not_ready' };
  return { ok: true as const, after };
}
export function planHash(input: Pick<Registration, 'workspace_id' | 'resources'>) {
  return digest({
    workspace_id: input.workspace_id,
    resources: [...input.resources].sort((a, b) => resourceKey(a).localeCompare(resourceKey(b)))
  });
}
