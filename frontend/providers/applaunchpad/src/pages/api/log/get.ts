import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { monitorFetch } from '@/services/monitorFetch';
import type { NextApiRequest, NextApiResponse } from 'next';

interface LogQueryParams {
  time: string;
  namespace: string;
  app: string;
  limit: number;
  jsonMode: boolean;
  stderrMode: boolean;
  numberMode: boolean;
  numberLevel?: string;
  pod: string[];
  container: string[];
  keyword: string;
  jsonQuery: any[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  if (req.method !== 'POST') {
    return jsonRes(res, {
      code: 405,
      error: 'Method not allowed'
    });
  }

  try {
    const kubeconfig = await authSession(req.headers);
    const { namespace } = await getK8s({
      kubeconfig: kubeconfig
    });

    const params: LogQueryParams = {
      time: req.body.time || '1h',
      namespace: req.body.namespace,
      app: req.body.app,
      limit: parseInt(req.body.limit) || 10,
      jsonMode: req.body.jsonMode === 'true',
      stderrMode: req.body.stderrMode === 'true',
      numberMode: req.body.numberMode === 'true',
      numberLevel: req.body.numberLevel,
      pod: Array.isArray(req.body.pod) ? req.body.pod : [],
      container: Array.isArray(req.body.container) ? req.body.container : [],
      keyword: req.body.keyword || '',
      jsonQuery: req.body.jsonQuery || []
    };

    const result = await monitorFetch(
      {
        url: '/queryLogsByParams',
        method: 'POST',
        params: params
      },
      kubeconfig
    );

    jsonRes(res, {
      code: 200,
      data: result
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
