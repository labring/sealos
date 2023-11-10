import { ApiBaseParamsMap } from '@/constants/kube-api';
import { ResourceKey } from '@/constants/kube-object';
import { listResource } from '@/services/backend/api';
import { authSession } from '@/services/backend/auth';
import { getKubeApiParams } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { getRequest } from '@/utils/request';
import { isArray, isError } from 'lodash';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { serverUrl, requestOpts, namespace } = getKubeApiParams(await authSession(req.headers));
    const resource = req.query.resource;
    if (!resource || isArray(resource)) {
      throw new Error(`invalid resource ${resource}`);
    }

    const apiBaseParams = ApiBaseParamsMap[resource as ResourceKey];
    if (!apiBaseParams) {
      throw new Error(`invalid resource ${resource}`);
    }

    const {
      code,
      error = null,
      data = null
    } = await listResource({
      urlParams: {
        ...apiBaseParams,
        serverUrl,
        namespace
      },
      opts: requestOpts
    });

    const { code, error = null, data = null } = await getRequest(apiUrl, requestOpts);
    if (isError(error)) throw error;
    jsonRes(res, {
      code,
      data
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

const generateApiBaseUrl = (params: KubeApiUrlParams): string => {
  if (!params.apiGroup || params.apiGroup === '')
    return `${params.serverUrl}/${params.apiPrefix}/${params.apiVersion}/namespaces/${params.namespace}/${params.resource}`;
  return `${params.serverUrl}/${params.apiPrefix}/${params.apiGroup}/${params.apiVersion}/namespaces/${params.namespace}/${params.resource}`;
};
