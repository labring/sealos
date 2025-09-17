import { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const kubeconfig = await authSession(req).catch(() => null);
  if (!kubeconfig) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const k8s = await getK8s({ kubeconfig }).catch(() => null);
  if (!k8s) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const { databaseName, backupName } = req.query as {
    databaseName: string;
    backupName: string;
  };

  if (!databaseName || !backupName) {
    return jsonRes(res, {
      code: 400,
      message: 'Database name and backup name are required'
    });
  }

  if (req.method === 'DELETE') {
    try {
      const group = 'dataprotection.kubeblocks.io';
      const version = 'v1alpha1';
      const plural = 'backups';

      // Delete the backup custom resource
      const result = await k8s.k8sCustomObjects.deleteNamespacedCustomObject(
        group,
        version,
        k8s.namespace,
        plural,
        backupName
      );

      return jsonRes(res, {
        code: 200,
        message: 'Backup deleted successfully',
        data: {
          backupName: backupName,
          dbName: databaseName,
          deletedAt: new Date().toISOString()
        }
      });
    } catch (err: any) {
      console.error('Error deleting backup:', err);

      // Check if backup not found
      if (err?.response?.statusCode === 404) {
        return jsonRes(res, {
          code: 404,
          message: 'Backup not found'
        });
      }

      return jsonRes(res, handleK8sError(err));
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
