import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import { EnhancedLogParser } from '@/utils/LogParser';
import { SupportReconfigureDBType } from '@/types/db';
import { LoggingConfiguration, ServiceLogConfigs } from '@/constants/log';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { namespace, k8sExec } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const {
      podName,
      dbType,
      logType,
      logPath,
      page = 1,
      pageSize = 100
    } = req.body as {
      podName: string;
      dbType: SupportReconfigureDBType;
      logType: keyof LoggingConfiguration;
      logPath: string;
      page?: number;
      pageSize?: number;
    };

    if (!podName || !dbType || !logType || !logPath) {
      throw new Error('Missing required parameters: podName, dbType, logType or logPath');
    }

    const kubefs = new KubeFileSystem(k8sExec);

    const startLine = (page - 1) * pageSize + 1;
    const endLine = page * pageSize;

    const logConfig = ServiceLogConfigs[dbType][logType];
    if (!logConfig) {
      throw new Error('Invalid log type');
    }

    let data = '';

    for (const containerName of logConfig.containerNames) {
      try {
        data = await kubefs.execCommand(namespace, podName, containerName, [
          'sed',
          '-n',
          `${startLine},${endLine}p`,
          logPath
        ]);
        if (data) break;
      } catch (error) {
        continue;
      }
    }

    console.log(data, 'data');

    const logParser = new EnhancedLogParser();
    const start = performance.now();
    const str = logParser.parseLogString(data);
    const end = performance.now();

    console.log(
      `日志解析耗时: ${(end - start).toFixed(
        2
      )}ms, 日志路径: ${logPath}, 页码: ${page}, 每页大小: ${pageSize}`
    );

    jsonRes(res, { data: str });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
