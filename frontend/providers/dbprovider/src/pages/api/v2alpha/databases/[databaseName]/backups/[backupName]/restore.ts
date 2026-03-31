import { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { json2CreateCluster, json2Account } from '@/utils/json2Yaml';
import { DBTypeEnum, defaultDBEditValue } from '@/constants/db';
import type { DBEditType } from '@/types/db';
import { storageFormatToGi } from '@/utils/tools';
import { customAlphabet } from 'nanoid';
import z from 'zod';
import {
  sendError,
  sendK8sError,
  sendValidationError,
  ErrorType,
  ErrorCode
} from '@/types/v2alpha/error';
import { cpuFormatToM, memoryFormatToMi } from '@sealos/shared';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 8);

const restoreBodySchema = z.object({
  replicas: z.number().min(1).optional(),
  name: z.string().trim().min(1).optional()
});

function filterUserLabels(labels: Record<string, string> = {}): Record<string, string> {
  const {
    'clusterdefinition.kubeblocks.io/name': _dbType,
    'clusterversion.kubeblocks.io/name': _dbVersion,
    'app.kubernetes.io/instance': _instance,
    ...userLabels
  } = labels;
  return userLabels;
}

function parseKubernetesResource(
  value: string | undefined,
  resourceType: 'cpu' | 'memory' | 'storage',
  defaultValue: number
): number {
  if (!value) return defaultValue;
  try {
    if (resourceType === 'cpu') {
      if (value.endsWith('m')) return cpuFormatToM(value);
      const numValue = parseFloat(value);
      return isNaN(numValue) ? defaultValue : numValue;
    } else if (resourceType === 'memory') {
      return memoryFormatToMi(value);
    } else if (resourceType === 'storage') {
      return storageFormatToGi(value, defaultValue);
    }
  } catch (error) {
    console.error('Error parsing resource:', error);
  }
  return defaultValue;
}

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

  const { databaseName, backupName } = req.query as {
    databaseName: string;
    backupName: string;
  };

  if (!databaseName || !backupName) {
    return sendError(res, {
      status: 400,
      type: ErrorType.VALIDATION_ERROR,
      code: ErrorCode.INVALID_PARAMETER,
      message: 'Database name and backup name are required.'
    });
  }

  if (req.method !== 'POST') {
    return sendError(res, {
      status: 405,
      type: ErrorType.CLIENT_ERROR,
      code: ErrorCode.METHOD_NOT_ALLOWED,
      message: 'Method not allowed. Use POST.'
    });
  }

  try {
    const bodyParseResult = restoreBodySchema.safeParse(req.body);
    if (!bodyParseResult.success) {
      return sendValidationError(res, bodyParseResult.error, 'Invalid request body.');
    }

    const { replicas, name } = bodyParseResult.data;
    const restoreDbName = name || `${databaseName}-${nanoid(8).toLowerCase()}`;

    const group = 'dataprotection.kubeblocks.io';
    const version = 'v1alpha1';
    const plural = 'backups';

    const { body: backupInfo } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
      group,
      version,
      k8s.namespace,
      plural,
      backupName
    )) as any;

    if (!backupInfo) {
      return sendError(res, {
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: 'Backup not found.'
      });
    }

    let dbType =
      backupInfo.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'] ||
      DBTypeEnum.postgresql;
    let dbVersion =
      backupInfo.metadata?.labels?.['clusterversion.kubeblocks.io/name'] || 'postgresql-14.8.2';
    let originalResource = { ...defaultDBEditValue };
    let originalLabels = {};
    const clusterGroup = 'apps.kubeblocks.io';
    const clusterVersion = 'v1alpha1';
    const clusterPlural = 'clusters';

    try {
      const { body: clusterInfo } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
        clusterGroup,
        clusterVersion,
        k8s.namespace,
        clusterPlural,
        databaseName
      )) as any;

      if (clusterInfo) {
        originalLabels = filterUserLabels(clusterInfo.metadata?.labels);

        if (!backupInfo.metadata?.labels?.['clusterdefinition.kubeblocks.io/name']) {
          dbType = clusterInfo.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'] || dbType;
        }
        if (!backupInfo.metadata?.labels?.['clusterversion.kubeblocks.io/name']) {
          dbVersion =
            clusterInfo.metadata?.labels?.['clusterversion.kubeblocks.io/name'] || dbVersion;
        }

        const componentSpec = clusterInfo.spec?.componentSpecs?.[0];
        if (componentSpec) {
          const cpuLimit = componentSpec.resources?.limits?.cpu;
          const memoryLimit = componentSpec.resources?.limits?.memory;
          const storageRequest =
            componentSpec.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage;

          originalResource = {
            ...defaultDBEditValue,
            cpu: parseKubernetesResource(cpuLimit, 'cpu', defaultDBEditValue.cpu),
            memory: parseKubernetesResource(memoryLimit, 'memory', defaultDBEditValue.memory),
            storage: parseKubernetesResource(storageRequest, 'storage', defaultDBEditValue.storage),
            replicas: replicas || componentSpec.replicas || defaultDBEditValue.replicas,
            autoBackup: clusterInfo.spec?.backup
              ? {
                  start: clusterInfo.spec.backup.enabled || false,
                  type: 'day',
                  week: [],
                  hour: clusterInfo.spec.backup.cronExpression
                    ? clusterInfo.spec.backup.cronExpression.split(' ')[1] || '18'
                    : '18',
                  minute: clusterInfo.spec.backup.cronExpression
                    ? clusterInfo.spec.backup.cronExpression.split(' ')[0] || '00'
                    : '00',
                  saveTime: parseInt(
                    clusterInfo.spec.backup.retentionPeriod?.replace('days', '') || '7'
                  ),
                  saveType: 'd'
                }
              : defaultDBEditValue.autoBackup
          };
        }
      }
    } catch (err) {
      if (replicas) {
        originalResource.replicas = replicas;
      }
    }

    const backupData = {
      name: backupName,
      namespace: k8s.namespace,
      connectionPassword:
        backupInfo.metadata?.annotations?.['dataprotection.kubeblocks.io/connection-password'] || ''
    };

    const dbEditData: DBEditType = {
      ...originalResource,
      dbName: restoreDbName,
      dbType: dbType as DBTypeEnum,
      dbVersion,
      terminationPolicy: 'WipeOut',
      labels: originalLabels
    };

    const clusterYaml = json2CreateCluster(dbEditData, backupData, {
      storageClassName: 'openebs-backup'
    });
    const accountYaml = json2Account(dbEditData);

    await k8s.applyYamlList([accountYaml, clusterYaml], 'create');

    return res.status(204).end();
  } catch (err: any) {
    if (err?.response?.statusCode === 404) {
      return sendError(res, {
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: 'Backup not found.'
      });
    }

    if (err?.response?.statusCode === 409) {
      return sendError(res, {
        status: 409,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.ALREADY_EXISTS,
        message: 'Database with this name already exists.'
      });
    }

    return sendK8sError(res, err);
  }
}
