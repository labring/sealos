import { ServiceLogConfigs } from '@/constants/log';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { ApiResp } from '@/services/kubernet';
import { SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import type { NextApiRequest, NextApiResponse } from 'next';
import { logsFileSchemas } from '@/types/apis/v2alpha';
import { sendError, sendValidationError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
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
    const { namespace, k8sExec } = k8s;
    const parseResult = logsFileSchemas.query.safeParse({
      podName: req.query.podName as string,
      dbType: req.query.dbType as SupportReconfigureDBType,
      logType: req.query.logType as LogTypeEnum
    });
    if (!parseResult.success) {
      return sendValidationError(res, parseResult.error, 'Invalid query parameters.');
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

    return res.status(200).json({ code: 200, data: validFiles } as any);
  } catch (err: any) {
    return sendError(res, {
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to retrieve log files.',
      details: err?.message || String(err)
    });
  }
}
