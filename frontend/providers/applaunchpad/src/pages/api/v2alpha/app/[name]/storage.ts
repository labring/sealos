import { NextApiRequest, NextApiResponse } from 'next';
import { createK8sContext, getAppByName, processAppResponse } from '@/services/backend';
import { PatchUtils, V1PersistentVolumeClaim } from '@kubernetes/client-node';
import { UpdateStorageSchema } from '@/types/v2alpha/request_schema';
import { json2DeployCr } from '@/utils/deployYaml2Json';
import { mountPathToConfigMapKey } from '@/utils/tools';
import type { AppEditType } from '@/types/app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', ['PATCH']);
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { name: appName } = req.query as { name: string };

    const parseResult = UpdateStorageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body.',
        details: parseResult.error.issues
      });
    }

    const { storage } = parseResult.data;

    if (storage.length === 0) {
      return res.status(400).json({
        error: 'At least one storage configuration is required'
      });
    }

    const paths = storage.map((s) => s.path);

    if (new Set(paths).size !== paths.length) {
      return res.status(400).json({
        error: 'Duplicate storage paths are not allowed'
      });
    }

    for (const store of storage) {
      if (!store.size.match(/^\d+(\.\d+)?(Gi|Mi|Ti)$/i)) {
        return res.status(400).json({
          error: `Invalid storage size format: ${store.size}. Use format like "10Gi", "1Ti", etc.`
        });
      }

      if (!store.path.startsWith('/')) {
        return res.status(400).json({
          error: `Storage path must be absolute: ${store.path}`
        });
      }
    }

    const k8s = await createK8sContext(req);
    const currentAppResponse = await getAppByName(appName, k8s);
    const currentAppData = await processAppResponse(currentAppResponse, false);

    if (!currentAppData) {
      return res.status(404).json({
        error: `App ${appName} not found`
      });
    }

    if (currentAppData.kind !== 'statefulset') {
      return res.status(400).json({
        error:
          'Storage updates are only supported for StatefulSet applications. Convert your application to StatefulSet first.'
      });
    }

    try {
      const updatedAppData: AppEditType = { ...currentAppData };

      const existingStorageByPath = new Map();
      updatedAppData.storeList.forEach((store) => {
        existingStorageByPath.set(store.path, store);
      });

      for (const newStore of storage) {
        let numericValue = 1;
        const sizeMatch = newStore.size.match(/^(\d+(?:\.\d+)?)(Gi|Mi|Ti)$/i);
        if (sizeMatch) {
          const [, value, unit] = sizeMatch;
          numericValue = parseFloat(value);

          if (unit.toLowerCase() === 'mi') {
            numericValue = numericValue / 1024;
          } else if (unit.toLowerCase() === 'ti') {
            numericValue = numericValue * 1024;
          }
        }

        const storeItem = {
          name: mountPathToConfigMapKey(newStore.path),
          path: newStore.path,
          value: Math.ceil(numericValue)
        };

        if (existingStorageByPath.has(newStore.path)) {
          const existingIndex = updatedAppData.storeList.findIndex(
            (store) => store.path === newStore.path
          );
          if (existingIndex >= 0) {
            updatedAppData.storeList[existingIndex] = storeItem;
          }
        } else {
          updatedAppData.storeList.push(storeItem);
        }
      }

      const newStatefulSetYaml = json2DeployCr(updatedAppData, 'statefulset');

      const { k8sCore, k8sApp, namespace, applyYamlList } = k8s;

      await k8sApp.deleteNamespacedStatefulSet(
        appName,
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
      await applyYamlList([newStatefulSetYaml], 'create');

      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        await updateExistingPVCs(k8sCore, namespace, appName, storage);
      } catch (pvcError: any) {
        console.error('PVC updates failed after StatefulSet recreation:', pvcError.message);
      }

      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to update storage:', error);
      return res.status(500).json({
        error: error.message || 'Failed to update storage',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } catch (error: any) {
    console.error('Error in storage handler:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function updateExistingPVCs(
  k8sCore: any,
  namespace: string,
  appName: string,
  newStorageConfig: Array<{ path: string; size: string }>
) {
  try {
    const {
      body: { items: allPvc }
    } = await k8sCore.listNamespacedPersistentVolumeClaim(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${appName}`
    );

    if (!allPvc || allPvc.length === 0) {
      return;
    }

    const boundPVCs = allPvc.filter(
      (pvc: V1PersistentVolumeClaim) => pvc.status?.phase === 'Bound'
    );
    const pendingPVCs = allPvc.filter(
      (pvc: V1PersistentVolumeClaim) => pvc.status?.phase === 'Pending'
    );

    if (boundPVCs.length === 0) {
      return;
    }

    const pathSet = new Set(newStorageConfig.map((storage) => storage.path));
    if (pathSet.size !== newStorageConfig.length) {
      throw new Error('Duplicate storage paths are not allowed');
    }

    const nameSet = new Set(
      newStorageConfig.map((storage) => mountPathToConfigMapKey(storage.path))
    );
    if (nameSet.size !== newStorageConfig.length) {
      throw new Error('Duplicate storage names (generated from paths) are not allowed');
    }

    const updatePromises = boundPVCs.map(async (pvc: V1PersistentVolumeClaim) => {
      const pvcName = pvc.metadata?.name;
      const pvcPath = pvc.metadata?.annotations?.path;
      const newStorageItem = newStorageConfig.find((storage) => storage.path === pvcPath);
      if (!pvcName || !pvcPath || !newStorageItem) {
        return;
      }
      if (pvc.status?.phase === 'Pending') {
        return;
      }

      let newSizeValue = 1;
      if (newStorageItem.size) {
        const match = newStorageItem.size.match(/^(\d+)/);
        if (match) {
          newSizeValue = parseInt(match[1]);
        } else {
          throw new Error(`Invalid storage size format: ${newStorageItem.size}`);
        }
      }

      const currentSizeValue = parseInt(pvc.metadata?.annotations?.value || '1');
      if (newSizeValue < currentSizeValue) {
        throw new Error(
          `Cannot shrink PVC ${pvcName} from ${currentSizeValue}Gi to ${newSizeValue}Gi. PVC can only be expanded.`
        );
      }

      if (
        pvc.metadata?.annotations?.value &&
        pvc.spec?.resources?.requests?.storage &&
        pvc.metadata?.annotations?.value !== newSizeValue.toString()
      ) {
        const jsonPatch = [
          {
            op: 'replace',
            path: '/spec/resources/requests/storage',
            value: `${newSizeValue}Gi`
          },
          {
            op: 'replace',
            path: '/metadata/annotations/value',
            value: newSizeValue.toString()
          }
        ];

        try {
          if (pvc.status?.phase !== 'Bound') {
            return;
          }

          await k8sCore.patchNamespacedPersistentVolumeClaim(
            pvcName,
            namespace,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            {
              headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH }
            }
          );
        } catch (patchError: any) {
          const errorMessage =
            patchError.body?.message || patchError.message || 'HTTP request failed';
          throw new Error(`Failed to expand PVC ${pvcName}: ${errorMessage}`);
        }
      }
    });

    await Promise.all(updatePromises);
  } catch (error: any) {
    console.error('Error updating existing PVCs:', error.message);
    throw error;
  }
}
