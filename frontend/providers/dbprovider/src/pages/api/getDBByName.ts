import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail } from '@/utils/adapt';
import { defaultDBDetail } from '@/constants/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { name, mock } = req.query as { name: string; mock?: string };
    if (!name) {
      throw new Error('name is empty');
    }

    if (mock === 'true') {
      return jsonRes(res, {
        data: defaultDBDetail
      });
    }

    const body = await getCluster(req, name);
    const dbDetail = adaptDBDetail(body);

    try {
      const configurationBody = await getDBConfiguration(req, dbDetail.dbName, dbDetail.dbType);
      if (configurationBody) {
        const parameterConfig = extractParameterConfigFromConfiguration(
          configurationBody,
          dbDetail.dbType
        );
        dbDetail.parameterConfig = parameterConfig;
      }
    } catch (error) {
      console.log('Failed to get configuration:', error);
    }

    jsonRes(res, {
      data: dbDetail
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function getCluster(req: NextApiRequest, name: string) {
  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'clusters',
    name
  )) as {
    body: KbPgClusterType;
  };

  return body;
}

export async function getDBConfiguration(req: NextApiRequest, dbName: string, dbType: string) {
  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  try {
    // Generate configuration name based on dbType
    let configurationName = '';
    switch (dbType) {
      case 'postgresql':
        configurationName = `${dbName}-postgresql`;
        break;
      case 'apecloud-mysql':
        configurationName = `${dbName}-mysql`;
        break;
      case 'mysql':
        configurationName = `${dbName}-mysql`;
        break;
      case 'mongodb':
        configurationName = `${dbName}-mongodb`;
        break;
      case 'redis':
        configurationName = `${dbName}-redis`;
        break;
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }

    const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'configurations',
      configurationName
    )) as {
      body: any;
    };

    return body;
  } catch (err: any) {
    return null;
  }
}

function extractParameterConfigFromConfiguration(configuration: any, dbType: string) {
  if (!configuration?.spec?.configItemDetails) {
    return undefined;
  }

  const parameterConfig: {
    maxConnections?: string;
    timeZone?: string;
    lowerCaseTableNames?: string;
    isMaxConnectionsCustomized?: boolean;
    maxmemory?: string;
  } = {};

  let hasParams = false;

  for (const configItem of configuration.spec.configItemDetails) {
    if (configItem.configFileParams) {
      // Extract parameters from different config files based on database type
      switch (dbType) {
        case 'postgresql':
          if (configItem.configFileParams['postgresql.conf']) {
            const pgParams = configItem.configFileParams['postgresql.conf'].parameters || {};
            if (pgParams['max_connections']) {
              parameterConfig.maxConnections = String(pgParams['max_connections']);
              parameterConfig.isMaxConnectionsCustomized = true;
              hasParams = true;
            }
            if (pgParams['timezone']) {
              parameterConfig.timeZone = String(pgParams['timezone']);
              hasParams = true;
            }
          }
          break;

        case 'apecloud-mysql':
          if (configItem.configFileParams['my.cnf']) {
            const mysqlParams = configItem.configFileParams['my.cnf'].parameters || {};
            if (mysqlParams['max_connections']) {
              parameterConfig.maxConnections = String(mysqlParams['max_connections']);
              parameterConfig.isMaxConnectionsCustomized = true;
              hasParams = true;
            }
            if (mysqlParams['default-time-zone']) {
              const timezone = String(mysqlParams['default-time-zone']);
              // Convert back from offset to timezone name
              if (timezone === '+00:00') {
                parameterConfig.timeZone = 'UTC';
              } else if (timezone === '+08:00') {
                parameterConfig.timeZone = 'Asia/Shanghai';
              } else {
                parameterConfig.timeZone = timezone;
              }
              hasParams = true;
            }
            if (mysqlParams['lower_case_table_names'] !== undefined) {
              parameterConfig.lowerCaseTableNames = String(mysqlParams['lower_case_table_names']);
              hasParams = true;
            }
          }
          break;

        case 'mysql':
          if (configItem.configFileParams['my.cnf']) {
            const mysqlParams = configItem.configFileParams['my.cnf'].parameters || {};
            if (mysqlParams['max_connections']) {
              parameterConfig.maxConnections = String(mysqlParams['max_connections']);
              parameterConfig.isMaxConnectionsCustomized = true;
              hasParams = true;
            }
            if (mysqlParams['default-time-zone']) {
              const timezone = String(mysqlParams['default-time-zone']);
              // Convert back from offset to timezone name
              if (timezone === '+00:00') {
                parameterConfig.timeZone = 'UTC';
              } else if (timezone === '+08:00') {
                parameterConfig.timeZone = 'Asia/Shanghai';
              } else {
                parameterConfig.timeZone = timezone;
              }
              hasParams = true;
            }
            if (mysqlParams['lower_case_table_names'] !== undefined) {
              parameterConfig.lowerCaseTableNames = String(mysqlParams['lower_case_table_names']);
              hasParams = true;
            }
          }
          break;

        case 'mongodb':
          if (configItem.configFileParams['mongodb.conf']) {
            const mongoParams = configItem.configFileParams['mongodb.conf'].parameters || {};
            if (mongoParams['net.maxIncomingConnections']) {
              parameterConfig.maxConnections = String(mongoParams['net.maxIncomingConnections']);
              parameterConfig.isMaxConnectionsCustomized = true;
              hasParams = true;
            }
          }
          break;

        case 'redis':
          if (configItem.configFileParams['redis.conf']) {
            const redisParams = configItem.configFileParams['redis.conf'].parameters || {};
            if (redisParams['maxclients']) {
              parameterConfig.maxConnections = String(redisParams['maxclients']);
              parameterConfig.isMaxConnectionsCustomized = true;
              hasParams = true;
            }
            if (redisParams['maxmemory']) {
              parameterConfig.maxmemory = String(redisParams['maxmemory']);
              hasParams = true;
            }
          }
          break;
      }
    }
  }

  return hasParams ? parameterConfig : undefined;
}
