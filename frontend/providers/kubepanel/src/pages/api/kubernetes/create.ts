import axios from 'axios';
import yaml from 'js-yaml';
import { isString, merge } from 'lodash';
import { getApiUrl } from '@/services/backend/api';
import { mustGetTypedProperty } from '@/utils/api';
import { NextApiRequest, NextApiResponse } from 'next';
import { authKubeConfig } from '@/services/backend/auth';
import { handlerAxiosError, sendErrorResponse } from '@/services/backend/response';
import { hasTypedProperty, isObject } from '@/k8slens/utilities';
import { ErrnoCode, buildErrno } from '@/services/backend/error';
import { CreateQuery, CreateResponse } from '@/types/api/kubenertes';

function isCreateQuery(query: unknown): query is CreateQuery {
  return isObject(query) && hasTypedProperty(query, 'kind', isString);
}

export default async function handler(req: NextApiRequest, resp: NextApiResponse<CreateResponse>) {
  try {
    if (req.method !== 'POST')
      throw buildErrno('Request Method is not allowed', ErrnoCode.UserMethodNotAllow);

    const { namespace, config } = authKubeConfig(req.headers);
    if (!isCreateQuery(req.query))
      throw buildErrno(`There has some invalid query in ${req.query}`, ErrnoCode.UserBadRequest);

    const { kind } = req.query;
    const url = getApiUrl(kind, namespace);
    const createdData = yaml.load(mustGetTypedProperty(req.body, 'data', isString, 'string'));

    const data = merge(createdData, {
      kind,
      metadata: {
        namespace
      }
    });

    const res = await axios.post(url, data, config);
    resp.status(res.status).json({
      code: res.status,
      data: res.data
    });
  } catch (err: any) {
    sendErrorResponse(
      resp,
      handlerAxiosError(err, ErrnoCode.APICreateRequestError, ErrnoCode.APICreateResponseError)
    );
  }
}
