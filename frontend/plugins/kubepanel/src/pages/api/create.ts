import { ApiBaseParamsMap } from '@/constants/kube-api';
import { ResourceKey } from '@/constants/kube-object';
import { createResource } from '@/services/backend/api';
import { authSession } from '@/services/backend/auth';
import { getKubeApiParams } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { mustGetTypedProperty } from '@/utils/api';
import yaml from 'js-yaml';
import { isString } from 'lodash';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') throw new Error(`Method not allowed: ${req.method}`);

    const resource = mustGetTypedProperty(req.query, 'resource', isString, 'string');

    const apiBaseParams = ApiBaseParamsMap[resource as ResourceKey];
    if (!apiBaseParams) throw new Error(`invalid resource ${resource}`);

    const { serverUrl, requestOpts, namespace } = getKubeApiParams(await authSession(req.headers));

    const resourceData = yaml.load(mustGetTypedProperty(req.body, 'data', isString, 'string'));

    const data = await createResource(
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
