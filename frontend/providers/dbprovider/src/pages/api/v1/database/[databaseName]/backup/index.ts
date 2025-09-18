import { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { json2ManualBackup } from '@/utils/json2Yaml';
import { DBBackupMethodNameMap, DBBackupPolicyNameMap, DBTypeEnum } from '@/constants/db';
import { customAlphabet } from 'nanoid';
import z from 'zod';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 8);

// Simple schema - only remark is needed (and it's optional)
const createBackupBodySchema = z.object({
  remark: z.string().optional()
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

  const { databaseName } = req.query as { databaseName: string };

  if (!databaseName) {
    return jsonRes(res, {
      code: 400,
      message: 'Database name is required in URL path'
    });
  }

  if (req.method === 'POST') {
    try {
      // Parse request body
      const bodyParseResult = createBackupBodySchema.safeParse(req.body);
      if (!bodyParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request body.',
          error: bodyParseResult.error.issues
        });
      }

      const { remark } = bodyParseResult.data;

      // Get database cluster info to extract dbType
      const clusterGroup = 'apps.kubeblocks.io';
      const clusterVersion = 'v1alpha1';
      const clusterPlural = 'clusters';

      const { body: clusterInfo } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
        clusterGroup,
        clusterVersion,
        k8s.namespace,
        clusterPlural,
        databaseName
      )) as any;

      if (!clusterInfo) {
        return jsonRes(res, {
          code: 404,
          message: 'Database not found'
        });
      }

      // Extract dbType from cluster labels
      const dbType = clusterInfo.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'];

      if (!dbType) {
        return jsonRes(res, {
          code: 500,
          message: 'Cannot determine database type from cluster'
        });
      }

      // Generate 8-character random lowercase backup name
      const backupName = `${databaseName}-backup-${nanoid()}`;

      // Create backup policy name based on database type
      const backupPolicyName = `${databaseName}-${DBBackupPolicyNameMap[dbType as DBTypeEnum]}-backup-policy`;
      const backupMethod = DBBackupMethodNameMap[dbType as DBTypeEnum];

      if (!backupMethod) {
        return jsonRes(res, {
          code: 400,
          message: `Unsupported database type: ${dbType}`
        });
      }

      // Generate backup YAML
      const backupYaml = json2ManualBackup({
        name: backupName,
        backupPolicyName,
        backupMethod,
        remark
      });

      // Apply the backup YAML
      await k8s.applyYamlList([backupYaml], 'create');

      return jsonRes(res, {
        code: 200,
        message: 'Backup created successfully',
        data: {
          backupName,
          dbName: databaseName,
          dbType,
          remark
        }
      });
    } catch (err: any) {
      console.error('Error creating backup:', err);

      // Check if database not found
      if (err?.response?.statusCode === 404) {
        return jsonRes(res, {
          code: 404,
          message: 'Database not found'
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
