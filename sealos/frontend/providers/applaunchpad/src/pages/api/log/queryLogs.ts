import { JsonFilterItem } from '@/pages/app/detail/logs';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';

import type { NextApiRequest, NextApiResponse } from 'next';

export interface LogQueryPayload {
  app?: string;
  time?: string;
  namespace?: string;
  limit?: string;
  jsonMode?: string;
  stderrMode?: string;
  numberMode?: string;
  numberLevel?: string;
  pod?: string[];
  container?: string[];
  keyword?: string;
  jsonQuery?: JsonFilterItem[];
  exportMode?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const logUrl = global.AppConfig.launchpad.components.log.url;

  if (!logUrl) {
    return jsonRes(res, {
      code: 400,
      error: 'logUrl is not set'
    });
  }

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

    if (!req.body.app) {
      return jsonRes(res, {
        code: 400,
        error: 'app is required'
      });
    }

    const {
      time = '30d',
      app = '',
      limit = '10',
      jsonMode = 'true',
      stderrMode = 'false',
      numberMode = 'false',
      numberLevel = '',
      pod = [],
      container = [],
      keyword = '',
      jsonQuery = [],
      exportMode = false
    } = req.body as LogQueryPayload;

    const params: LogQueryPayload = {
      time: time,
      namespace: namespace,
      app: app,
      limit: limit,
      jsonMode: jsonMode,
      stderrMode: stderrMode,
      numberMode: numberMode,
      ...(numberLevel && { numberLevel: numberLevel }),
      pod: Array.isArray(pod) ? pod : [],
      container: Array.isArray(container) ? container : [],
      keyword: keyword,
      jsonQuery: Array.isArray(jsonQuery) ? jsonQuery : []
    };

    console.log(params, 'params');
    const result = await fetch(logUrl + '/queryLogsByParams', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json',
        Authorization: encodeURIComponent(kubeconfig)
      }
    });
    console.log('fetch /queryLogsByParams: ', result.status);
    const data = await result.text();

    jsonRes(res, {
      code: 200,
      data: data
    });
  } catch (error) {
    console.log(error, 'error');
    jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
