import { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { json2ManualBackup } from '@/utils/json2Yaml';
import {
  DBBackupMethodNameMap,
  DBBackupPolicyNameMap,
  DBTypeEnum,
  DBNameLabel
} from '@/constants/db';
import { customAlphabet } from 'nanoid';
import z from 'zod';
import { BACKUP_REMARK_LABEL_KEY, BackupStatusEnum } from '@/constants/backup';
import { decodeFromHex } from '@/utils/tools';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 8);

const createBackupBodySchema = z.object({
  description: z
    .string()
    .max(31, 'Description must be no more than 31 characters when encoded for Kubernetes labels')
    .optional(),
  name: z.string().trim().min(1).optional()
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
    return res.status(400).json({
      error: 'Database name is required in URL path'
    });
  }

  if (req.method === 'GET') {
    try {
      const group = 'dataprotection.kubeblocks.io';
      const version = 'v1alpha1';
      const plural = 'backups';

      const { body: backupList } = (await k8s.k8sCustomObjects.listNamespacedCustomObject(
        group,
        version,
        k8s.namespace,
        plural
      )) as any;

      const items: any[] = Array.isArray(backupList?.items) ? backupList.items : [];

      const backups = items
        .filter((item) => item?.metadata?.labels?.[DBNameLabel] === databaseName)
        .map((item) => {
          const labels = item?.metadata?.labels || {};
          const descriptionHex = labels[BACKUP_REMARK_LABEL_KEY];
          let description = '';
          if (descriptionHex) {
            try {
              description = decodeFromHex(descriptionHex);
            } catch (error) {
              description = '';
            }
          }

          const status = (
            (item?.status?.phase as BackupStatusEnum) || BackupStatusEnum.UnKnow
          ).toLowerCase();

          return {
            name: item?.metadata?.name || '',
            description,
            createdAt: item?.metadata?.creationTimestamp || '',
            status
          };
        });

      return res.status(200).json(backups);
    } catch (err: any) {
      return jsonRes(res, handleK8sError(err));
    }
  }

  if (req.method === 'POST') {
    try {
      // Parse request body
      const bodyParseResult = createBackupBodySchema.safeParse(req.body);
      if (!bodyParseResult.success) {
        return res.status(400).json({
          error: 'Invalid request body.',
          details: bodyParseResult.error.issues
        });
      }

      const { description, name } = bodyParseResult.data;

      // Validate description length: Kubernetes label value max 63 chars
      // Hex encoding doubles the length, so max 31 chars for original string
      if (description && Buffer.from(description).toString('hex').length > 63) {
        return res.status(400).json({
          error:
            'Description is too long. Maximum length is 31 characters when encoded for Kubernetes labels.'
        });
      }

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
        return res.status(404).json({
          error: 'Database not found'
        });
      }

      // Extract dbType from cluster labels
      const dbType = clusterInfo.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'];

      if (!dbType) {
        return res.status(500).json({
          error: 'Cannot determine database type from cluster'
        });
      }

      // Generate 8-character random lowercase backup name
      const backupName = name || `${databaseName}-backup-${nanoid()}`;

      // Create backup policy name based on database type
      const backupPolicyName = `${databaseName}-${DBBackupPolicyNameMap[dbType as DBTypeEnum]}-backup-policy`;
      const backupMethod = DBBackupMethodNameMap[dbType as DBTypeEnum];

      if (!backupMethod) {
        return res.status(400).json({
          error: `Unsupported database type: ${dbType}`
        });
      }

      // Generate backup YAML
      const backupYaml = json2ManualBackup({
        name: backupName,
        backupPolicyName,
        backupMethod,
        remark: description
      });

      // Apply the backup YAML
      await k8s.applyYamlList([backupYaml], 'create');

      return res.status(204).end();
    } catch (err: any) {
      console.error('Error creating backup:', err);

      // Check if database not found
      if (err?.response?.statusCode === 404) {
        return res.status(404).json({
          error: 'Database not found'
        });
      }

      // Check if it's a label validation error
      if (err?.response?.statusCode === 422) {
        const errorMessage =
          err?.response?.body?.message || err?.message || 'Invalid backup configuration';
        if (errorMessage.includes('must be no more than 63 characters')) {
          return res.status(400).json({
            error:
              'Description is too long. Maximum length is 31 characters when encoded for Kubernetes labels.'
          });
        }
        return res.status(400).json({
          error: errorMessage
        });
      }

      // Return error without code field
      const errorInfo = handleK8sError(err);
      return res.status(errorInfo.code || 500).json({
        error: errorInfo.message || 'Internal server error'
      });
    }
  }

  return res.status(405).json({
    error: 'Method not allowed'
  });
}
