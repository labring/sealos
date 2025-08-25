import { hasOptionalTypedProperty, hasTypedProperty } from '@/k8slens/utilities';
import { getApiUrl } from '@/services/backend/api';
import { authKubeConfig } from '@/services/backend/auth';
import { ErrnoCode, buildErrno } from '@/services/backend/error';
import { handlerAxiosError, sendErrorResponse } from '@/services/backend/response';
import { ListQuery, ListResponse } from '@/types/api/kubenertes';
import { KubeList } from '@/types/kube-resource';
import axios from 'axios';
import { isObject, isString } from 'lodash';
import type { NextApiRequest, NextApiResponse } from 'next';

function isListQuery(query: unknown): query is ListQuery {
  return (
    isObject(query) &&
    hasTypedProperty(query, 'kind', isString) &&
    hasOptionalTypedProperty(query, 'limit', isString)
  );
}

export default async function handler(req: NextApiRequest, resp: NextApiResponse<ListResponse>) {
  try {
    if (req.method !== 'GET')
      throw buildErrno('Request Method is not allowed', ErrnoCode.UserMethodNotAllow);

    const { namespace, config } = authKubeConfig(req.headers);
    if (!isListQuery(req.query)) {
      throw buildErrno(`There has some invalid query in ${req.query}`, ErrnoCode.UserBadRequest);
    }

    // TODO: list limited items
    const { kind, limit } = req.query;
    const url = getApiUrl(kind, namespace);

    const res = await axios.get(url, config);
    resp.status(res.status).json({
      code: res.status,
      data: res.data as KubeList<any>
    });
  } catch (err: any) {
    sendErrorResponse(
      resp,
      handlerAxiosError(err, ErrnoCode.APIListRequestError, ErrnoCode.APIListResponseError)
    );
  }
}
