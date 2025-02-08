import { JsonFilterItem } from '@/pages/app/detail/logs';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';

import type { NextApiRequest, NextApiResponse } from 'next';

export interface PodListQueryPayload {
  app?: string;
  time?: string;
  namespace?: string;
  podQuery?: string;
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

    const { time = '30d', app = '', podQuery = 'true' } = req.body as PodListQueryPayload;

    const params: PodListQueryPayload = {
      time: time,
      namespace: namespace,
      app: app,
      podQuery: podQuery
    };

    console.log(params, 'params');
    const result = await fetch(logUrl + '/queryPodList', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json',
        Authorization: encodeURIComponent(kubeconfig)
      }
    });
    console.log('fetch /queryPodList: ', result.status);
    if (result.status !== 200) {
      return jsonRes(res, {
        data: []
      });
    }

    const data = await result.json();

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
