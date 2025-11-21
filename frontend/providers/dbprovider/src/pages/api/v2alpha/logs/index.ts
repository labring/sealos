import { DBTypeEnum } from '@/constants/db';
import { ServiceLogConfigs } from '@/constants/log';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { DatabaseLogService } from '@/utils/logParsers/LogParser';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { logsDataSchemas } from '@/types/apis/v2alpha';

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

    const parseResult = logsDataSchemas.query.safeParse({
      podName: req.query.podName as string,
      dbType: req.query.dbType as SupportReconfigureDBType,
      logType: req.query.logType as LogTypeEnum,
      logPath: req.query.logPath as string,
      page: parseInt((req.query.page as string) || '0'),
      pageSize: parseInt((req.query.pageSize as string) || '10')
    });
    if (!parseResult.success) {
      return jsonRes(res, {
        code: ResponseCode.BAD_REQUEST,
        message: ResponseMessages[ResponseCode.BAD_REQUEST]
      });
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

    return jsonRes(res, { data: result });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
