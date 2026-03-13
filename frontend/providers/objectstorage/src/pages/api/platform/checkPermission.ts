import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp, jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';
import { initK8s } from 'sealos-desktop-sdk/service';
import * as k8s from '@kubernetes/client-node';

/**
 * Check user permissions by attempting to patch a bucket
 * This API is used to verify if the user has sufficient permissions to perform operations
 * Returns 403 if the user lacks permissions (e.g., not an admin, insufficient balance)
 */
async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { bucketName } = req.query as { bucketName: string };

  if (!bucketName) {
    return jsonRes(res, {
      code: 400,
      message: 'bucketName is required'
    });
  }

  const client = await initK8s({ req });

  const group = 'objectstorage.sealos.io';
  const version = 'v1';
  const plural = 'objectstoragebuckets';

  const patchBody = {
    metadata: {
      annotations: {
        'update-time': new Date().toISOString()
      }
    }
  };

  const options = {
    headers: { 'Content-Type': k8s.PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH }
  };

  await client.k8sCustomObjects.patchNamespacedCustomObject(
    group,
    version,
    client.namespace,
    plural,
    bucketName,
    patchBody,
    undefined,
    undefined,
    undefined,
    options
  );

  jsonRes(res, { code: 200, data: 'success' });
}

export default withErrorHandler(handler);
