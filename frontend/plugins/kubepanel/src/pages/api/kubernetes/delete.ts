import axios from 'axios';
import { hasTypedProperty } from '@/k8slens/utilities';
import { getApiUrl } from '@/services/backend/api';
import { authKubeConfig } from '@/services/backend/auth';
import { ErrnoCode, buildErrno } from '@/services/backend/error';
import { handlerAxiosError, sendErrorResponse } from '@/services/backend/response';
import { DeleteQuery, DeleteResponse } from '@/types/api/kubenertes';
import { isString, isObject } from 'lodash';
import { NextApiRequest, NextApiResponse } from 'next';

function isDeleteQuery(query: unknown): query is DeleteQuery {
  return (
    isObject(query) &&
    hasTypedProperty(query, 'kind', isString) &&
    hasTypedProperty(query, 'name', isString)
  );
}

export default async function handler(req: NextApiRequest, resp: NextApiResponse<DeleteResponse>) {
  try {
    if (req.method !== 'DELETE')
      throw buildErrno('Request Method is not allowed', ErrnoCode.UserMethodNotAllow);

    const { namespace, config } = authKubeConfig(req.headers);
    if (!isDeleteQuery(req.query))
      throw buildErrno(`There has some invalid query in ${req.query}`, ErrnoCode.UserBadRequest);

    const { kind, name } = req.query;
    const url = getApiUrl(kind, namespace, name);

    const res = await axios.delete(url, config);
    resp.status(res.status).json({
      code: res.status,
      data: res.data
    });
  } catch (err: any) {
    sendErrorResponse(
      resp,
      handlerAxiosError(err, ErrnoCode.APIDeleteRequestError, ErrnoCode.APIDeleteResponseError)
    );
  }
}
