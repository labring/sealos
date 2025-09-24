import { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { json2CreateCluster, json2Account } from '@/utils/json2Yaml';
import { DBTypeEnum, defaultDBEditValue } from '@/constants/db';
import type { DBEditType } from '@/types/db';
import { cpuFormatToM, memoryFormatToMi, storageFormatToGi } from '@/utils/tools';
import { nanoid } from 'nanoid';
import z from 'zod';

const restoreBodySchema = z.object({
  replicas: z.number().min(1).optional()
});

function parseKubernetesResource(
  value: string | undefined,
  resourceType: 'cpu' | 'memory' | 'storage',
  defaultValue: number
): number {
  if (!value) return defaultValue;

  try {
    if (resourceType === 'cpu') {
      if (value.endsWith('m')) {
        return cpuFormatToM(value);
      } else {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? defaultValue : numValue;
      }
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

      const { replicas } = bodyParseResult.data;
      const newDbName = nanoid(8).toLowerCase();

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
        return jsonRes(res, {
          code: 404,
          message: 'Backup not found'
        });
      }

      let dbType =
        backupInfo.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'] ||
        DBTypeEnum.postgresql;
      let dbVersion =
        backupInfo.metadata?.labels?.['clusterversion.kubeblocks.io/name'] || 'postgresql-14.8.2';
      let originalResource = { ...defaultDBEditValue };
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
          if (!backupInfo.metadata?.labels?.['clusterdefinition.kubeblocks.io/name']) {
            dbType =
              clusterInfo.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'] || dbType;
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
              storage: parseKubernetesResource(
                storageRequest,
                'storage',
                defaultDBEditValue.storage
              ),
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
          backupInfo.metadata?.annotations?.['dataprotection.kubeblocks.io/connection-password'] ||
          ''
      };

      const dbEditData: DBEditType = {
        ...originalResource,
        dbName: newDbName,
        dbType: dbType as DBTypeEnum,
        dbVersion,
        terminationPolicy: 'WipeOut',
        labels: {}
      };

      const clusterYaml = json2CreateCluster(dbEditData, backupData, {
        storageClassName: 'openebs-backup'
      });
      const accountYaml = json2Account(dbEditData);

      const applyResult = await k8s.applyYamlList([accountYaml, clusterYaml], 'create');

      return jsonRes(res, {
        code: 200,
        message: 'Database restore initiated successfully',
        data: {
          originalDbName: databaseName,
          newDbName,
          backupName: backupName,
          dbType,
          dbVersion,
          resource: {
            cpu: dbEditData.cpu,
            memory: dbEditData.memory,
            storage: dbEditData.storage,
            replicas: dbEditData.replicas
          },
          restoredAt: new Date().toISOString()
        }
      });
    } catch (err: any) {
      if (err?.response?.statusCode === 404) {
        return jsonRes(res, {
          code: 404,
          message: 'Backup not found'
        });
      }

      if (err?.response?.statusCode === 409) {
        return jsonRes(res, {
          code: 409,
          message: 'Database with this name already exists'
        });
      }

      return jsonRes(res, handleK8sError(err));
    }
  }

  // Handle DELETE request
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
