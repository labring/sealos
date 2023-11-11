import { ApiBaseParamsMap } from '@/constants/kube-api';
import { ResourceKey } from '@/constants/kube-object';
import { updateResource } from '@/services/backend/api';
import { authSession } from '@/services/backend/auth';
import { getKubeApiParams } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import yaml from 'js-yaml';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'PUT') throw new Error(`Method not allowed: ${req.method}`);

    const { resource, name } = req.query;
    if (typeof resource !== 'string') throw new Error(`invalid resource ${resource}`);
    if (typeof name !== 'string') throw new Error(`invalid name ${name}`);

    const apiBaseParams = ApiBaseParamsMap[resource as ResourceKey];
    if (!apiBaseParams) throw new Error(`invalid resource ${resource}`);

    if (!req.body.data || typeof req.body.data !== 'string')
      throw new Error(`invalid body data ${req.body.data}`);
    const resourceData = yaml.load(req.body.data);

    const { serverUrl, requestOpts, namespace } = getKubeApiParams(await authSession(req.headers));
    const data = await updateResource(
      {
        urlParams: { ...apiBaseParams, serverUrl, namespace },
        opts: requestOpts
      },
      name,
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
