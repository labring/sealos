import { ServiceLogConfigs } from '@/constants/log';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { logsFileSchemas } from '@/types/apis/v2alpha';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
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
    const { namespace, k8sExec, k8sCore } = k8s;
    const parseResult = logsFileSchemas.query.safeParse({
      podName: req.query.podName as string,
      dbType: req.query.dbType as SupportReconfigureDBType,
      logType: req.query.logType as LogTypeEnum
    });
    if (!parseResult.success) {
      return jsonRes(res, {
        code: ResponseCode.BAD_REQUEST,
        message: ResponseMessages[ResponseCode.BAD_REQUEST]
      });
    }
    const { podName, dbType, logType } = parseResult.data;

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
        break;
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
