import { DBTypeEnum } from '@/constants/db';
import { ServiceLogConfigs } from '@/constants/log';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { ApiResp } from '@/services/kubernet';
import { SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { DatabaseLogService } from '@/utils/logParsers/LogParser';
import type { NextApiRequest, NextApiResponse } from 'next';
import { logsDataSchemas } from '@/types/apis/v2alpha';
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
    const { namespace, k8sExec, k8sCore } = k8s;

    const parseResult = logsDataSchemas.query.safeParse({
      podName: req.query.podName as string,
      dbType: req.query.dbType as SupportReconfigureDBType,
      logType: req.query.logType as LogTypeEnum,
      logPath: req.query.logPath as string,
      page: parseInt((req.query.page as string) || '0'),
      pageSize: parseInt((req.query.pageSize as string) || '10')
    });
    if (!parseResult.success) {
      return sendValidationError(res, parseResult.error, 'Invalid query parameters.');
    }
    const { podName, dbType, logType, logPath, page = 0, pageSize = 10 } = parseResult.data;

    const logConfig = ServiceLogConfigs[dbType][logType];

    if (!logConfig) {
      throw new Error('Invalid log type');
    }

    const logService = new DatabaseLogService(k8sExec, k8sCore, namespace);

    const result = await logService.readLogs({
      podName,
      containerNames: logConfig.containerNames,
      logPath,
      page,
      pageSize,
      dbType: dbType as DBTypeEnum,
      logType
    });

    return res.status(200).json({ code: 200, data: result } as any);
  } catch (err: any) {
    return sendError(res, {
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to retrieve log data.',
      details: err?.message || String(err)
    });
  }
}
