import { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { json2ManualBackup } from '@/utils/json2Yaml';
import {
  DBBackupMethodNameMap,
  DBBackupPolicyNameMap,
  DBTypeEnum,
  BackupClusterUidLabel
} from '@/constants/db';
import { customAlphabet } from 'nanoid';
import z from 'zod';
import { BACKUP_REMARK_LABEL_KEY, BackupStatusEnum } from '@/constants/backup';
import { decodeFromHex } from '@/utils/tools';
import {
  sendError,
  sendK8sError,
  sendValidationError,
  ErrorType,
  ErrorCode
} from '@/types/v2alpha/error';

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
    return sendError(res, {
      status: 401,
      type: ErrorType.AUTHENTICATION_ERROR,
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Unauthorized, please login again.'
    });
  }

  const k8s = await getK8s({ kubeconfig }).catch(() => null);
  if (!k8s) {
    return sendError(res, {
      status: 401,
      type: ErrorType.AUTHENTICATION_ERROR,
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Unauthorized, please login again.'
    });
  }

  const { databaseName } = req.query as { databaseName: string };

  if (!databaseName) {
    return sendError(res, {
      status: 400,
      type: ErrorType.VALIDATION_ERROR,
      code: ErrorCode.INVALID_PARAMETER,
      message: 'Database name is required in URL path.'
    });
  }

  if (req.method === 'GET') {
    try {
      const clusterGroup = 'apps.kubeblocks.io';
      const clusterVersion = 'v1alpha1';
      const clusterPlural = 'clusters';

      let clusterInfo: any;
      try {
        const { body } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
          clusterGroup,
          clusterVersion,
          k8s.namespace,
          clusterPlural,
          databaseName
        )) as any;
        clusterInfo = body;
      } catch (err: any) {
        if (err?.response?.statusCode === 404) {
          return sendError(res, {
            status: 404,
            type: ErrorType.RESOURCE_ERROR,
            code: ErrorCode.NOT_FOUND,
            message: 'Database not found.'
          });
        }
        return sendK8sError(res, err);
      }

      const clusterUid = clusterInfo?.metadata?.uid;
      if (!clusterUid) {
        return sendError(res, {
          status: 404,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.NOT_FOUND,
          message: 'Database not found.'
        });
      }

      const group = 'dataprotection.kubeblocks.io';
      const version = 'v1alpha1';
      const plural = 'backups';

      const { body: backupList } = (await k8s.k8sCustomObjects.listNamespacedCustomObject(
        group,
        version,
        k8s.namespace,
        plural,
        undefined,
        undefined,
        undefined,
        undefined,
        `${BackupClusterUidLabel}=${clusterUid}`
      )) as any;

      const items: any[] = Array.isArray(backupList?.items) ? backupList.items : [];

      const backups = items.map((item) => {
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
      return sendK8sError(res, err);
    }
  }

  if (req.method === 'POST') {
    try {
      const bodyParseResult = createBackupBodySchema.safeParse(req.body);
      if (!bodyParseResult.success) {
        return sendValidationError(res, bodyParseResult.error, 'Invalid request body.');
      }

      const { description, name } = bodyParseResult.data;

      if (description && Buffer.from(description).toString('hex').length > 63) {
        return sendError(res, {
          status: 400,
          type: ErrorType.VALIDATION_ERROR,
          code: ErrorCode.INVALID_VALUE,
          message:
            'Description is too long. Maximum length is 31 characters when encoded for Kubernetes labels.'
        });
      }

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
        return sendError(res, {
          status: 404,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.NOT_FOUND,
          message: 'Database not found.'
        });
      }

      const dbType = clusterInfo.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'];

      if (!dbType) {
        return sendError(res, {
          status: 500,
          type: ErrorType.INTERNAL_ERROR,
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Cannot determine database type from cluster.'
        });
      }

      const backupName = name || `${databaseName}-backup-${nanoid()}`;
      const backupPolicyName = `${databaseName}-${
        DBBackupPolicyNameMap[dbType as DBTypeEnum]
      }-backup-policy`;
      const backupMethod = DBBackupMethodNameMap[dbType as DBTypeEnum];

      if (!backupMethod) {
        return sendError(res, {
          status: 400,
          type: ErrorType.VALIDATION_ERROR,
          code: ErrorCode.INVALID_VALUE,
          message: `Unsupported database type: ${dbType}.`
        });
      }

      const backupYaml = json2ManualBackup({
        name: backupName,
        backupPolicyName,
        backupMethod,
        remark: description
      });

      await k8s.applyYamlList([backupYaml], 'create');

      return res.status(204).end();
    } catch (err: any) {
      console.error('Error creating backup:', err);

      if (err?.response?.statusCode === 404) {
        return sendError(res, {
          status: 404,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.NOT_FOUND,
          message: 'Database not found.'
        });
      }

      if (err?.response?.statusCode === 422) {
        const errorMessage =
          err?.response?.body?.message || err?.message || 'Invalid backup configuration';
        if (errorMessage.includes('must be no more than 63 characters')) {
          return sendError(res, {
            status: 400,
            type: ErrorType.VALIDATION_ERROR,
            code: ErrorCode.INVALID_VALUE,
            message:
              'Description is too long. Maximum length is 31 characters when encoded for Kubernetes labels.'
          });
        }
        return sendError(res, {
          status: 400,
          type: ErrorType.VALIDATION_ERROR,
          code: ErrorCode.INVALID_VALUE,
          message: errorMessage
        });
      }

      return sendK8sError(res, err);
    }
  }

  return sendError(res, {
    status: 405,
    type: ErrorType.CLIENT_ERROR,
    code: ErrorCode.METHOD_NOT_ALLOWED,
    message: 'Method not allowed. Use GET or POST.'
  });
}
