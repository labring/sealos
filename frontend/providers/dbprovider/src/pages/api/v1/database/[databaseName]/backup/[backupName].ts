import { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { json2RestoreOpsRequest } from '@/utils/json2Yaml';
import { customAlphabet } from 'nanoid';
import z from 'zod';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 8);

const restoreBodySchema = z.object({
  databaseName: z.string().min(1).optional()
});

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

  if (req.method === 'POST') {
    try {
      const bodyParseResult = restoreBodySchema.safeParse(req.body);
      if (!bodyParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request body.',
          error: bodyParseResult.error.issues
        });
      }

      const { databaseName: newDatabaseName } = bodyParseResult.data;
      const restoreDbName = newDatabaseName
        ? `${newDatabaseName}-${nanoid(8).toLowerCase()}`
        : `${databaseName}-${nanoid(8).toLowerCase()}`;

      // Validate backup existence
      const backupGroup = 'dataprotection.kubeblocks.io';
      const backupVersion = 'v1alpha1';
      const backupPlural = 'backups';

      try {
        await k8s.k8sCustomObjects.getNamespacedCustomObject(
          backupGroup,
          backupVersion,
          k8s.namespace,
          backupPlural,
          backupName
        );
      } catch (err: any) {
        if (err?.response?.statusCode === 404) {
          return jsonRes(res, {
            code: 404,
            message: 'Backup not found'
          });
        }
        throw err;
      }

      const restoreYaml = json2RestoreOpsRequest({
        clusterName: restoreDbName,
        namespace: k8s.namespace,
        backupName
      });

      await k8s.applyYamlList([restoreYaml], 'create');

      return jsonRes(res, {
        code: 200,
        message: 'Restore operation initiated successfully',
        data: 'Restore operation initiated successfully'
      });
    } catch (err: any) {
      console.log('error restore backup', err);
      return jsonRes(res, handleK8sError(err));
    }
  }

  if (req.method === 'DELETE') {
    try {
      const group = 'dataprotection.kubeblocks.io';
      const version = 'v1alpha1';
      const plural = 'backups';

      await k8s.k8sCustomObjects.deleteNamespacedCustomObject(
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
