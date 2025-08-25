import { ServiceLogConfigs } from '@/constants/log';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { namespace, k8sExec } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { podName, dbType, logType } = req.body as {
      podName: string;
      dbType: SupportReconfigureDBType;
      logType: LogTypeEnum;
    };

    if (!podName || !dbType) {
      throw new Error('Missing required parameters: podName, containerName or logPath');
    }

    const kubefs = new KubeFileSystem(k8sExec);

    const logConfig = ServiceLogConfigs[dbType][logType];

    console.log('/api/logs/getFiles', { podName, dbType, logType, logConfig });

    if (!logConfig) {
      throw new Error('Invalid log type');
    }

    let files, directories;
    let lastError: any;
    for (const container of logConfig.containerNames) {
      try {
        const result = await kubefs.ls({
          namespace,
          podName,
          containerName: container,
          path: logConfig.path,
          showHidden: false
        });
        files = result.files;
        directories = result.directories;
        break; // 成功后退出循环
      } catch (error) {
        lastError = error;
        console.error('/api/logs/getFiles error', error);
        continue;
      }
    }

    if (!files) {
      throw new Error(lastError?.message || 'No valid log files found in any container');
    }

    const validFiles = logConfig.filter(files);

    if (!validFiles || validFiles.length === 0) {
      throw new Error('No valid log files found');
    }

    jsonRes(res, { data: validFiles });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
