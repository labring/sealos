import { ApiBaseParamsMap } from '@/constants/kube-api';
import { ResourceKey } from '@/constants/kube-object';
import { KubeObject } from '@/k8slens/kube-object';
import { create } from '@/services/backend/api';
import { authSession } from '@/services/backend/auth';
import { getKubeApiParams } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import yaml from 'js-yaml';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') throw new Error(`Method not allowed: ${req.method}`);

    const { resource } = req.query;
    if (!resource || typeof resource !== 'string') throw new Error(`invalid resource ${resource}`);

    const apiBaseParams = ApiBaseParamsMap[resource as ResourceKey];
    if (!apiBaseParams) throw new Error(`invalid resource ${resource}`);

    const { serverUrl, requestOpts, namespace } = getKubeApiParams(await authSession(req.headers));

    if (!req.body.data) throw new Error(`invalid data ${req.body.data}`);
    const resourceData = yaml.load(req.body.data);

    const data = await create(
      {
        urlParams: {
          ...apiBaseParams,
          serverUrl,
          namespace
        },
        opts: requestOpts
      },
      resourceData
    );

    jsonRes(res, {
      code: 200,
      data
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
