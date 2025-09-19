import { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { json2CreateCluster, json2Account } from '@/utils/json2Yaml';
import { DBTypeEnum, defaultDBEditValue } from '@/constants/db';
import { customAlphabet } from 'nanoid';
import z from 'zod';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 8);

const restoreBodySchema = z.object({
  newDbName: z.string().min(1, 'New database name is required')
});

function parseKubernetesResource(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;

  if (value.endsWith('m')) {
    const numValue = parseInt(value.slice(0, -1));
    return isNaN(numValue) ? defaultValue : numValue / 1000;
  }

  if (value.endsWith('Mi')) {
    const numValue = parseInt(value.slice(0, -2));
    return isNaN(numValue) ? defaultValue : numValue;
  }
  if (value.endsWith('Gi')) {
    const numValue = parseInt(value.slice(0, -2));
    return isNaN(numValue) ? defaultValue : numValue * 1024;
  }
  if (value.endsWith('Ki')) {
    const numValue = parseInt(value.slice(0, -2));
    return isNaN(numValue) ? defaultValue : Math.round(numValue / 1024);
  }

  if (value.includes('Gi')) {
    const numValue = parseInt(value.replace('Gi', ''));
    return isNaN(numValue) ? defaultValue : numValue;
  }
  if (value.includes('Mi')) {
    const numValue = parseInt(value.replace('Mi', ''));
    return isNaN(numValue) ? defaultValue : Math.round(numValue / 1024);
  }

  const numValue = parseFloat(value);
  return isNaN(numValue) ? defaultValue : numValue;
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

  // Handle POST request - Restore backup
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

      const { newDbName } = bodyParseResult.data;

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

      const clusterGroup = 'apps.kubeblocks.io';
      const clusterVersion = 'v1alpha1';
      const clusterPlural = 'clusters';

      let dbType: DBTypeEnum = DBTypeEnum.postgresql;
      let dbVersion = 'postgresql-14.8.2';
      let originalResource = defaultDBEditValue;

      try {
        const { body: clusterInfo } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
          clusterGroup,
          clusterVersion,
          k8s.namespace,
          clusterPlural,
          databaseName
        )) as any;

        if (clusterInfo) {
          dbType =
            clusterInfo.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'] ||
            DBTypeEnum.postgresql;
          dbVersion =
            clusterInfo.metadata?.labels?.['clusterversion.kubeblocks.io/name'] ||
            'postgresql-14.8.2';

          const componentSpec = clusterInfo.spec?.componentSpecs?.[0];
          if (componentSpec) {
            const cpuLimit = componentSpec.resources?.limits?.cpu;
            const memoryLimit = componentSpec.resources?.limits?.memory;
            const storageRequest =
              componentSpec.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage;

            originalResource = {
              ...defaultDBEditValue,
              cpu: parseKubernetesResource(cpuLimit, defaultDBEditValue.cpu),
              memory: parseKubernetesResource(memoryLimit, defaultDBEditValue.memory),
              storage: parseKubernetesResource(storageRequest, defaultDBEditValue.storage),
              replicas: componentSpec.replicas || defaultDBEditValue.replicas
            };
          }
        }
      } catch (err) {
        console.log('Could not fetch original cluster info, using defaults');
      }

      const backupData = {
        name: backupName,
        namespace: k8s.namespace,
        connectionPassword: ''
      };

      const clusterYaml = json2CreateCluster(
        {
          ...originalResource,
          dbName: newDbName,
          dbType: dbType as any,
          dbVersion,
          terminationPolicy: 'WipeOut'
        },
        backupData
      );

      const accountYaml = json2Account({
        ...originalResource,
        dbName: newDbName,
        dbType: dbType as any,
        dbVersion
      });

      await k8s.applyYamlList([accountYaml, clusterYaml], 'create');

      return jsonRes(res, {
        code: 200,
        message: 'Database restore initiated successfully',
        data: {
          originalDbName: databaseName,
          newDbName,
          backupName: backupName,
          dbType,
          dbVersion,
          restoredAt: new Date().toISOString()
        }
      });
    } catch (err: any) {
      console.error('Error restoring backup:', err);

      if (err?.response?.statusCode === 404) {
        return jsonRes(res, {
          code: 404,
          message: 'Backup not found'
        });
      }

      return jsonRes(res, handleK8sError(err));
    }
  }

  if (req.method === 'DELETE') {
    try {
      const group = 'dataprotection.kubeblocks.io';
      const version = 'v1alpha1';
      const plural = 'backups';

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
