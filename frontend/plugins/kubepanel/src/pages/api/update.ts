import { ApiBaseParamsMap } from '@/constants/kube-api';
import { ResourceKey } from '@/constants/kube-object';
import { updateResource } from '@/services/backend/api';
import { authSession } from '@/services/backend/auth';
import { getKubeApiParams } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import yaml from 'js-yaml';
import { mustGetTypedProperty } from '@/utils/api';
import { entries, isString } from 'lodash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'PUT') throw new Error(`Method not allowed: ${req.method}`);

    const resource = mustGetTypedProperty(req.query, 'resource', isString, 'string');
    const name = mustGetTypedProperty(req.query, 'name', isString, 'string');

    const apiBaseParams = ApiBaseParamsMap[resource as ResourceKey];
    if (!apiBaseParams) throw new Error(`invalid resource ${resource}`);

    const resourceData = yaml.load(mustGetTypedProperty(req.body, 'data', isString, 'string'));

    const { serverUrl, requestOpts, namespace } = getKubeApiParams(await authSession(req.headers));
    const data = await updateResource(
      {
        urlParams: { ...apiBaseParams, serverUrl, namespace },
        opts: requestOpts
      },
      name,
      resourceData
    );
    console.log(data);

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
