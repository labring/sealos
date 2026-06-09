import { NextApiRequest, NextApiResponse } from 'next';
import { getAppByName, processAppResponse } from '@/services/backend';
import { PatchUtils, V1PersistentVolumeClaim } from '@kubernetes/client-node';
import { UpdateStorageSchema, k8sAppNameSchema } from '@/types/v2alpha/request_schema';
import { json2DeployCr } from '@/utils/deployYaml2Json';
import { mountPathToConfigMapKey } from '@/utils/tools';
import type { AppEditType } from '@/types/app';
import { parseK8sQuantityOrZero, storageAnnotationToQuantity } from '@/utils/resourceQuantity';

import { sendError, sendValidationError, ErrorType, ErrorCode } from '@/types/v2alpha/error';
import {
  getK8sContextOrSendError,
  sendK8sOperationError,
  sendInternalError
} from '@/pages/api/v2alpha/k8sContext';
import { z } from 'zod';

const AppNameParamSchema = z.object({ name: k8sAppNameSchema });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', ['PATCH']);
      return sendError(res, {
        status: 405,
        type: ErrorType.CLIENT_ERROR,
        code: ErrorCode.METHOD_NOT_ALLOWED,
        message: `HTTP method ${req.method} is not supported. Use PATCH to update application storage.`
      });
    }

    const paramResult = AppNameParamSchema.safeParse(req.query);
    if (!paramResult.success) {
      return sendValidationError(
        res,
        paramResult.error,
        'Application name path parameter is invalid or missing.'
      );
    }

    const { name: appName } = paramResult.data;

    const parseResult = UpdateStorageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendValidationError(
        res,
        parseResult.error,
        'Storage configuration validation failed. Please check path format and size values.'
      );
    }

    const { storage } = parseResult.data;

    const k8s = await getK8sContextOrSendError(req, res);
    if (!k8s) return;

    let currentAppData;
    try {
      const currentAppResponse = await getAppByName(appName, k8s);
      currentAppData = await processAppResponse(currentAppResponse, false);
    } catch (err) {
      console.error('Get application error:', err);
      return sendK8sOperationError(
        res,
        err,
        `Failed to retrieve application "${appName}". The Kubernetes operation encountered an error.`
      );
    }

    if (!currentAppData) {
      return sendError(res, {
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: `Application "${appName}" not found in the current namespace. Please verify the application name.`
      });
    }

    if (currentAppData.kind !== 'statefulset') {
      return sendError(res, {
        status: 400,
        type: ErrorType.CLIENT_ERROR,
        code: ErrorCode.STORAGE_REQUIRES_STATEFULSET,
        message: `Storage updates are only supported for StatefulSet applications. Application "${appName}" is currently a ${currentAppData.kind}.`,
        details: 'Convert your application to StatefulSet to enable storage management.'
      });
    }

    try {
      const updatedAppData: AppEditType = { ...currentAppData };

      const existingStorageByPath = new Map();
      updatedAppData.storeList.forEach((store) => {
        existingStorageByPath.set(store.path, store);
      });

      for (const newStore of storage) {
        const storeItem = {
          name: mountPathToConfigMapKey(newStore.path),
          path: newStore.path,
          value: parseK8sQuantityOrZero(newStore.size)
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
    } catch (error) {
      console.error('Kubernetes update storage error:', error);
      return sendK8sOperationError(
        res,
        error,
        `Failed to update storage for application "${appName}". The StatefulSet recreation or PVC update failed.`,
        'STORAGE_UPDATE_FAILED'
      );
    }
  } catch (err) {
    console.error('Unexpected error in storage handler:', err);
    return sendInternalError(
      res,
      err,
      'An unexpected error occurred while processing the storage update. Please try again or contact support.'
    );
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

      const newSizeQuantity = parseK8sQuantityOrZero(newStorageItem.size || '1Gi');
      const currentSizeQuantity = pvc.spec?.resources?.requests?.storage
        ? parseK8sQuantityOrZero(pvc.spec.resources.requests.storage)
        : storageAnnotationToQuantity(pvc.metadata?.annotations?.value || '1');

      if (newSizeQuantity.cmp(currentSizeQuantity) < 0) {
        throw new Error(
          `Cannot shrink PVC ${pvcName} from ${currentSizeQuantity.formatForDisplay({
            format: 'BinarySI',
            scale: 'auto',
            digits: 4
          })} to ${newSizeQuantity.formatForDisplay({
            format: 'BinarySI',
            scale: 'auto',
            digits: 4
          })}. PVC can only be expanded.`
        );
      }

      if (
        pvc.metadata?.annotations?.value &&
        pvc.spec?.resources?.requests?.storage &&
        !currentSizeQuantity.equals(newSizeQuantity)
      ) {
        const jsonPatch = [
          {
            op: 'replace',
            path: '/spec/resources/requests/storage',
            value: newSizeQuantity.withFormat('BinarySI').toString()
          },
          {
            op: 'replace',
            path: '/metadata/annotations/value',
            value: newSizeQuantity.formatForDisplay({
              format: 'BinarySI',
              scale: 'auto',
              digits: 4
            })
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
