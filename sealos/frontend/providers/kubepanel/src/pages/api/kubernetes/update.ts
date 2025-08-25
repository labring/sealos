import axios from 'axios';
import yaml from 'js-yaml';
import { authKubeConfig } from '@/services/backend/auth';
import { NextApiRequest, NextApiResponse } from 'next';
import { mustGetTypedProperty } from '@/utils/api';
import { isString, merge } from 'lodash';
import { hasTypedProperty, isObject } from '@/k8slens/utilities';
import { ErrnoCode, buildErrno } from '@/services/backend/error';
import { getApiUrl } from '@/services/backend/api';
import { handlerAxiosError, sendErrorResponse } from '@/services/backend/response';
import { UpdateQuery, UpdateResponse } from '@/types/api/kubenertes';

function isUpdateQuery(query: unknown): query is UpdateQuery {
  return (
    isObject(query) &&
    hasTypedProperty(query, 'kind', isString) &&
    hasTypedProperty(query, 'name', isString)
  );
}

export default async function handler(req: NextApiRequest, resp: NextApiResponse<UpdateResponse>) {
  try {
    if (req.method !== 'PUT')
      throw buildErrno('Request Method is not allowed', ErrnoCode.UserMethodNotAllow);

    const { namespace, config } = authKubeConfig(req.headers);
    if (!isUpdateQuery(req.query))
      throw buildErrno(`There has some invalid query in ${req.query}`, ErrnoCode.UserBadRequest);

    const { kind, name } = req.query;
    const url = getApiUrl(kind, namespace, name);
    const updatedData = yaml.load(mustGetTypedProperty(req.body, 'data', isString, 'string'));

    const data = merge(updatedData, {
      metadata: {
        name,
        namespace
      }
    });

    const res = await axios.put(url, data, config);
    resp.status(res.status).json({
      code: res.status,
      data: res.data
    });
  } catch (err: any) {
    sendErrorResponse(
      resp,
      handlerAxiosError(err, ErrnoCode.APIUpdateRequestError, ErrnoCode.APIUpdateResponseError)
    );
  }
}
