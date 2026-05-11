import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import { DatabaseLogService } from '@/utils/logParsers/LogParser';
import { DBTypeEnum } from '@/constants/db';
import type { NextApiRequest, NextApiResponse } from 'next';

const convertToDBTypeEnum = (dbType: SupportReconfigureDBType): DBTypeEnum => {
  switch (dbType) {
    case 'postgresql':
      return DBTypeEnum.postgresql;
    case 'mongodb':
      return DBTypeEnum.mongodb;
    case 'apecloud-mysql':
      return DBTypeEnum.mysql;
    case 'mysql':
      return DBTypeEnum.notapemysql;
    case 'redis':
      return DBTypeEnum.redis;
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    if (req.method !== 'POST') {
      return jsonRes(res, {
        code: 405,
        error: 'Method not allowed'
      });
    }

    const { namespace, k8sExec, k8sCore } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const {
      podName,
      dbType,
      logType,
      logPath = 'default',
      startTime,
      endTime,
      timeRange = '1h'
    } = req.body as {
      podName: string;
      dbType: SupportReconfigureDBType;
      logType: LogTypeEnum;
      logPath?: string;
      startTime?: number;
      endTime?: number;
      timeRange?: string;
    };

    if (!podName || !dbType || !logType) {
      return jsonRes(res, {
        code: 400,
        error: 'Missing required parameters: podName, dbType, logType'
      });
    }

    const kubeFileSystem = new KubeFileSystem(k8sExec);
    const logService = new DatabaseLogService(k8sExec, k8sCore, namespace);

    const logCountsData = await logService.getLogCounts({
      podName,
      dbType: convertToDBTypeEnum(dbType),
      logType,
      logPath,
      startTime,
      endTime,
      timeRange
    });

    return jsonRes(res, {
      code: 200,
      data: logCountsData
    });
  } catch (error) {
    console.error('Error getting log counts:', error);
    return jsonRes(res, {
      code: 500,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
