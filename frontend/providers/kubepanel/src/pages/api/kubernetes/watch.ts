import axios from 'axios';
import byline from 'byline';
import { hasOptionalTypedProperty, hasTypedProperty } from '@/k8slens/utilities';
import { getApiUrl } from '@/services/backend/api';
import { authKubeConfig } from '@/services/backend/auth';
import { ErrnoCode, buildErrno } from '@/services/backend/error';
import { handlerAxiosError, sendErrorResponse } from '@/services/backend/response';
import { WatchQuery, WatchResponse } from '@/types/api/kubenertes';
import { isObject, isString } from 'lodash';
import { NextApiRequest, NextApiResponse } from 'next';

function isWatchQuery(query: unknown): query is WatchQuery {
  return (
    isObject(query) &&
    hasTypedProperty(query, 'kind', isString) &&
    hasOptionalTypedProperty(query, 'name', isString)
  );
}

export default async function handler(req: NextApiRequest, resp: NextApiResponse<WatchResponse>) {
  try {
    if (req.method !== 'GET')
      throw buildErrno('Request Method is not allowed', ErrnoCode.UserMethodNotAllow);

    const { namespace, config } = authKubeConfig(req.headers);
    if (!isWatchQuery(req.query))
      throw buildErrno(`There has some invalid query in ${req.query}`, ErrnoCode.UserBadRequest);

    // TODO: watch specific item with its name
    const { kind, name, resourceVersion } = req.query;
    // if resourceVersion is empty string, it will list all items
    if (resourceVersion === '')
      throw buildErrno(`There has some invalid query in ${req.query}`, ErrnoCode.UserBadRequest);

    const url = getApiUrl(kind, namespace);
    setSSEHeaders(resp);
    const abortController = new AbortController();
    let eventId = 0;

    axios
      .get(url, {
        ...config,
        params: {
          resourceVersion,
          watch: 1,
          allowWatchBookmarks: true
        },
        signal: abortController.signal,
        responseType: 'stream'
      })
      .then((streamResp) => {
        byline(streamResp.data).on('data', (line) => {
          // check connection is open or not
          if (!resp.writable) {
            abortController.abort();
            return;
          }
          resp.write('event: watch\n');
          resp.write(`id: ${eventId++}\n`);
          resp.write(`data: ${line}\n\n`);
        });
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        sendErrorResponse(
          resp,
          handlerAxiosError(err, ErrnoCode.APIWatchRequestError, ErrnoCode.APIWatchResponseError)
        );
        abortController.abort();
      });
  } catch (err: any) {
    sendErrorResponse(resp, err);
  }
}

function setSSEHeaders(resp: NextApiResponse) {
  resp.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Content-Encoding': 'none',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });
}
