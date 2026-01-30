import { PatchUtils } from '@kubernetes/client-node';

import { devboxKey, devboxOwnerRefReadyKey } from '@/constants/devbox';

export type DevboxOwnerReference = {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
  controller: boolean;
  blockOwnerDeletion: boolean;
};

const normalizeOwnerReference = (ownerReference: DevboxOwnerReference): DevboxOwnerReference => ({
  apiVersion: ownerReference.apiVersion,
  kind: ownerReference.kind,
  name: ownerReference.name,
  uid: ownerReference.uid,
  controller: ownerReference.controller ?? true,
  blockOwnerDeletion: ownerReference.blockOwnerDeletion ?? false
});

export const buildDevboxOwnerReference = (devbox: any): DevboxOwnerReference | null => {
  const name = devbox?.metadata?.name;
  const uid = devbox?.metadata?.uid;
  if (!name || !uid) {
    return null;
  }

  return normalizeOwnerReference({
    apiVersion: devbox?.apiVersion || 'devbox.sealos.io/v1alpha1',
    kind: devbox?.kind || 'Devbox',
    name,
    uid,
    controller: true,
    blockOwnerDeletion: false
  });
};

export const isDevboxOwnerReferencesReady = (devbox: any): boolean =>
  devbox?.metadata?.annotations?.[devboxOwnerRefReadyKey] === 'true';

const hasOwnerReference = (
  ownerReferences: DevboxOwnerReference[] | undefined,
  ownerReference: DevboxOwnerReference
) => {
  if (!Array.isArray(ownerReferences)) {
    return false;
  }
  return ownerReferences.some((ref) => ref?.uid === ownerReference.uid);
};

const mergeOwnerReferences = (
  ownerReferences: DevboxOwnerReference[] | undefined,
  ownerReference: DevboxOwnerReference
) => {
  const existing = Array.isArray(ownerReferences) ? ownerReferences : [];
  if (hasOwnerReference(existing, ownerReference)) {
    return existing;
  }
  return [...existing, ownerReference];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getDevboxOwnerReference = async (
  k8sCustomObjects: any,
  namespace: string,
  devboxName: string,
  retries = 3,
  delayMs = 100
): Promise<DevboxOwnerReference | null> => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha1',
        namespace,
        'devboxes',
        devboxName
      )) as { body: any };
      return buildDevboxOwnerReference(body);
    } catch (error) {
      if (attempt === retries - 1) {
        break;
      }
      await sleep(delayMs);
    }
  }
  return null;
};

export const ensureDevboxOwnerReferences = async ({
  devboxName,
  namespace,
  ownerReference,
  k8sCore,
  k8sNetworkingApp,
  k8sCustomObjects
}: {
  devboxName: string;
  namespace: string;
  ownerReference: DevboxOwnerReference | null;
  k8sCore: any;
  k8sNetworkingApp: any;
  k8sCustomObjects: any;
}): Promise<boolean> => {
  if (!ownerReference) {
    return false;
  }

  const normalizedOwnerReference = normalizeOwnerReference(ownerReference);
  const labelSelector = `${devboxKey}=${devboxName}`;
  const patchOptions = {
    headers: {
      'Content-Type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH
    }
  };

  const patchTasks: Promise<any>[] = [];
  let hasPatchFailure = false;

  const queuePatch = (
    name: string | undefined,
    existingOwnerReferences: DevboxOwnerReference[] | undefined,
    patchFn: (name: string, ownerReferences: DevboxOwnerReference[]) => Promise<any>
  ) => {
    if (!name) {
      return;
    }
    const nextOwnerReferences = mergeOwnerReferences(existingOwnerReferences, normalizedOwnerReference);
    if (Array.isArray(existingOwnerReferences) && nextOwnerReferences.length === existingOwnerReferences.length) {
      return;
    }
    patchTasks.push(
      patchFn(name, nextOwnerReferences).catch((error) => {
        hasPatchFailure = true;
        console.warn('Failed to patch ownerReferences for resource:', name, error);
      })
    );
  };

  const serviceResponse = await k8sCore
    .readNamespacedService(devboxName, namespace)
    .catch(() => null);
  if (serviceResponse?.body) {
    const service = serviceResponse.body;
    queuePatch(
      service.metadata?.name,
      service.metadata?.ownerReferences,
      (name, ownerReferences) =>
        k8sCore.patchNamespacedService(
          name,
          namespace,
          {
            metadata: {
              ownerReferences
            }
          },
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          patchOptions
        )
    );
  }

  const configMapResponse = await k8sCore
    .listNamespacedConfigMap(namespace, undefined, undefined, undefined, undefined, labelSelector)
    .catch(() => null);
  const configMaps = configMapResponse?.body?.items || [];
  configMaps.forEach((configMap: any) => {
    queuePatch(
      configMap.metadata?.name,
      configMap.metadata?.ownerReferences,
      (name, ownerReferences) =>
        k8sCore.patchNamespacedConfigMap(
          name,
          namespace,
          {
            metadata: {
              ownerReferences
            }
          },
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          patchOptions
        )
    );
  });

  const pvcResponse = await k8sCore
    .listNamespacedPersistentVolumeClaim(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    )
    .catch(() => null);
  const pvcs = pvcResponse?.body?.items || [];
  pvcs.forEach((pvc: any) => {
    queuePatch(
      pvc.metadata?.name,
      pvc.metadata?.ownerReferences,
      (name, ownerReferences) =>
        k8sCore.patchNamespacedPersistentVolumeClaim(
          name,
          namespace,
          {
            metadata: {
              ownerReferences
            }
          },
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          patchOptions
        )
    );
  });

  const ingressResponse = await k8sNetworkingApp
    .listNamespacedIngress(namespace, undefined, undefined, undefined, undefined, labelSelector)
    .catch(() => null);
  const ingresses = ingressResponse?.body?.items || [];
  ingresses.forEach((ingress: any) => {
    queuePatch(
      ingress.metadata?.name,
      ingress.metadata?.ownerReferences,
      (name, ownerReferences) =>
        k8sNetworkingApp.patchNamespacedIngress(
          name,
          namespace,
          {
            metadata: {
              ownerReferences
            }
          },
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          patchOptions
        )
    );
  });

  const issuerResponse = await k8sCustomObjects
    .listNamespacedCustomObject(
      'cert-manager.io',
      'v1',
      namespace,
      'issuers',
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    )
    .catch(() => null);
  const issuers = (issuerResponse as any)?.body?.items || [];
  issuers.forEach((issuer: any) => {
    queuePatch(
      issuer.metadata?.name,
      issuer.metadata?.ownerReferences,
      (name, ownerReferences) =>
        k8sCustomObjects.patchNamespacedCustomObject(
          'cert-manager.io',
          'v1',
          namespace,
          'issuers',
          name,
          {
            metadata: {
              ownerReferences
            }
          },
          undefined,
          undefined,
          undefined,
          patchOptions
        )
    );
  });

  const certificateResponse = await k8sCustomObjects
    .listNamespacedCustomObject(
      'cert-manager.io',
      'v1',
      namespace,
      'certificates',
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    )
    .catch(() => null);
  const certificates = (certificateResponse as any)?.body?.items || [];
  certificates.forEach((certificate: any) => {
    queuePatch(
      certificate.metadata?.name,
      certificate.metadata?.ownerReferences,
      (name, ownerReferences) =>
        k8sCustomObjects.patchNamespacedCustomObject(
          'cert-manager.io',
          'v1',
          namespace,
          'certificates',
          name,
          {
            metadata: {
              ownerReferences
            }
          },
          undefined,
          undefined,
          undefined,
          patchOptions
        )
    );
  });

  if (patchTasks.length > 0) {
    await Promise.all(patchTasks);
  }

  return !hasPatchFailure;
};

export const markDevboxOwnerReferencesReady = async (
  k8sCustomObjects: any,
  namespace: string,
  devboxName: string,
  ownerReference?: DevboxOwnerReference | null
) => {
  if (!ownerReference) {
    return;
  }

  try {
    await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName,
      {
        metadata: {
          annotations: {
            [devboxOwnerRefReadyKey]: 'true'
          }
        }
      },
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH
        }
      }
    );
  } catch (error) {
    console.warn('Failed to mark devbox ownerReferences ready:', devboxName, error);
  }
};
