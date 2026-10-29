import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest } from 'next';
import { z } from 'zod';
import { verifyOAuth2AccessToken } from '@/services/backend/auth';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { K8sApi } from '@/services/backend/kubernetes/user';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { AcquisitionError, realm } from '../config';
import type { ResourceRef, WorkloadObject } from './proof';

export type DeploymentActor = {
  userUid: string;
  realm: 'global' | 'china';
  regionUid: string;
  regionDomain: string;
};
export type ResourceReader = (ref: ResourceRef) => Promise<WorkloadObject | null>;
const READ_TIMEOUT_MS = 2500;
export function deploymentRegion() {
  const regionUid = global.AppConfig?.cloud.regionUID;
  const regionDomain = global.AppConfig?.cloud.domain;
  if (!regionUid || !z.string().uuid().safeParse(regionUid).success || !regionDomain)
    throw new AcquisitionError(503, 'Resource region is not configured');
  return { regionUid, regionDomain };
}
export async function nativeDeploymentActor(req: NextApiRequest): Promise<DeploymentActor> {
  if (req.headers.origin) throw new AcquisitionError(403, 'Native operation only');
  const value = req.headers.authorization;
  const token = value?.startsWith('Bearer ') ? value.slice(7) : undefined;
  const claims = await verifyOAuth2AccessToken(token);
  const clients = (process.env.ACQUISITION_NATIVE_CLIENT_IDS || 'sealos-io,sealox-desktop-bja')
    .split(',')
    .map((value) => value.trim());
  if (
    !claims ||
    !clients.includes(claims.client_id) ||
    !z.string().uuid().safeParse(claims.sub).success
  )
    throw new AcquisitionError(401, 'Invalid native authentication');
  return { userUid: claims.sub, realm: realm(), ...deploymentRegion() };
}
export async function workspaceResourceReader(
  actor: DeploymentActor,
  workspaceId: string
): Promise<ResourceReader> {
  const currentRegion = deploymentRegion();
  if (actor.realm !== realm() || actor.regionUid !== currentRegion.regionUid)
    throw new AcquisitionError(403, 'Wrong resource region or account realm');
  const user = await globalPrisma.user.findUnique({
    where: { uid: actor.userUid },
    select: { status: true }
  });
  if (!user || user.status !== 'NORMAL_USER')
    throw new AcquisitionError(403, 'Account is unavailable');
  const membership = await prisma.userWorkspace.findFirst({
    where: {
      status: 'IN_WORKSPACE',
      workspace: { id: workspaceId },
      userCr: { userUid: actor.userUid }
    },
    include: { userCr: true }
  });
  if (!membership) throw new AcquisitionError(403, 'Workspace membership required');
  const raw = await getUserKubeconfigNotPatch(membership.userCr.crName, READ_TIMEOUT_MS);
  if (!raw) throw new AcquisitionError(503, 'User Kubernetes credentials unavailable');
  const kc = K8sApi(switchKubeconfigNamespace(raw, workspaceId));
  const apps = kc.makeApiClient(k8s.AppsV1Api);
  const custom = kc.makeApiClient(k8s.CustomObjectsApi);
  for (const api of [apps, custom])
    api.addInterceptor((options) => {
      options.timeout = READ_TIMEOUT_MS;
    });
  return async (ref) => {
    if (ref.namespace !== workspaceId) throw new AcquisitionError(403, 'Wrong proof namespace');
    try {
      if (ref.kind === 'Deployment')
        return (await apps.readNamespacedDeployment(ref.name, ref.namespace))
          .body as WorkloadObject;
      if (ref.kind === 'StatefulSet')
        return (await apps.readNamespacedStatefulSet(ref.name, ref.namespace))
          .body as WorkloadObject;
      const group = ref.kind === 'Cluster' ? 'apps.kubeblocks.io' : 'objectstorage.sealos.io';
      const version = ref.kind === 'Cluster' ? 'v1alpha1' : 'v1';
      const plural = ref.kind === 'Cluster' ? 'clusters' : 'objectstoragebuckets';
      return (
        await custom.getNamespacedCustomObject(group, version, ref.namespace, plural, ref.name)
      ).body as WorkloadObject;
    } catch (error) {
      const failure = error as { statusCode?: number; response?: { statusCode?: number } };
      if ((failure.statusCode ?? failure.response?.statusCode) === 404) return null;
      throw new AcquisitionError(503, 'Workload proof could not be read');
    }
  };
}
