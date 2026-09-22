import type { AppsV1Api, V1StatefulSet } from '@kubernetes/client-node';
import { isEqual, omit } from 'lodash';
import { storageQuantityToMi } from '@/utils/tools';

const errorCode = (error: any) => error?.body?.code ?? error?.response?.body?.code;

const forCreation = (resource: V1StatefulSet): V1StatefulSet => ({
  ...resource,
  status: undefined,
  metadata: omit(resource.metadata, [
    'uid',
    'resourceVersion',
    'creationTimestamp',
    'generation',
    'managedFields',
    'deletionTimestamp',
    'deletionGracePeriodSeconds'
  ])
});

/** Only an explicit capacity increase may replace an immutable claim template. */
export async function recreateStatefulSetForExpansion(
  api: AppsV1Api,
  namespace: string,
  name: string,
  desired: V1StatefulSet
): Promise<boolean> {
  const { body } = await api.readNamespacedStatefulSet(name, namespace);
  // The Kubernetes client returns model instances with undefined fields; compare their wire form.
  const current: V1StatefulSet = JSON.parse(JSON.stringify(body));
  const oldClaims = current.spec?.volumeClaimTemplates || [];
  const newClaims = desired.spec?.volumeClaimTemplates || [];
  if (!oldClaims.length || oldClaims.length !== newClaims.length) return false;
  if (
    !isEqual(current.spec?.selector, desired.spec?.selector) ||
    current.spec?.serviceName !== desired.spec?.serviceName
  )
    return false;

  let expanded = false;
  for (const oldClaim of oldClaims) {
    const next = newClaims.find((claim) => claim.metadata?.name === oldClaim.metadata?.name);
    if (!next) return false;
    const oldSize = storageQuantityToMi(oldClaim.spec?.resources?.requests?.storage || '0');
    const newSize = storageQuantityToMi(next.spec?.resources?.requests?.storage || '0');
    if (!oldSize || newSize < oldSize) return false;
    const normalizedSpec = (claim: typeof oldClaim) => ({
      ...claim.spec,
      volumeMode: claim.spec?.volumeMode || 'Filesystem',
      resources: {
        ...claim.spec?.resources,
        requests: omit(claim.spec?.resources?.requests, 'storage')
      }
    });
    if (!isEqual(normalizedSpec(oldClaim), normalizedSpec(next))) return false;
    if (oldClaim.metadata?.annotations?.path !== next.metadata?.annotations?.path) return false;
    expanded ||= newSize > oldSize;
  }
  if (!expanded || !current.metadata?.uid || !current.metadata.resourceVersion) return false;

  // Validate all other edits before deleting the controller. Its claim templates are immutable.
  await api.replaceNamespacedStatefulSet(
    name,
    namespace,
    {
      ...desired,
      metadata: { ...desired.metadata, resourceVersion: current.metadata.resourceVersion },
      spec: { ...desired.spec!, volumeClaimTemplates: oldClaims }
    },
    undefined,
    'All'
  );

  // Preserve dependents during controller replacement. The normal update strategy may then
  // roll Pods to the new revision; existing PVCs and their data must survive that rollout.
  await api.deleteNamespacedStatefulSet(
    name,
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    'Orphan',
    {
      preconditions: {
        uid: current.metadata.uid,
        resourceVersion: current.metadata.resourceVersion
      }
    }
  );

  // Orphan deletion is asynchronous. Do not race creation against the old controller.
  let deleted = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await api.readNamespacedStatefulSet(name, namespace);
    } catch (error) {
      if (errorCode(error) !== 404) throw error;
      deleted = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!deleted)
    throw new Error('Timed out waiting for StatefulSet orphan deletion; retry the update.');

  try {
    await api.createNamespacedStatefulSet(namespace, forCreation(desired));
  } catch (error) {
    // Never overwrite another controller. Recover the old one only if creation failed and it is absent.
    try {
      await api.readNamespacedStatefulSet(name, namespace);
    } catch (readError) {
      if (errorCode(readError) === 404) {
        await api.createNamespacedStatefulSet(namespace, forCreation(current));
      }
    }
    throw error;
  }
  return true;
}
