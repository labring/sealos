import { KindMap, Resources } from '@/constants/kube-object';
import { KubeObject } from '@/k8slens/kube-object';
import { merge } from 'lodash';
import { Options, get, post } from 'request';
import { PartialDeep } from 'type-fest';

type ApiPrefix = 'api' | 'apis';
type ApiGroup = 'apps';
type ApiVersion = 'v1';

export interface KubeApiUrlParams {
  serverUrl: string;
  apiPrefix: ApiPrefix;
  apiGroup?: ApiGroup;
  apiVersion: ApiVersion;
  namespace: string;
  resource: Resources;
}

interface Response {
  code: number;
  error?: Error;
  data?: any;
}

interface RequestBase {
  urlParams: KubeApiUrlParams;
  opts: Options;
}

interface QueryParams {
  watch: boolean | number;
  resourceVersion: string;
  timeoutSeconds: number;
  limit: number;
  continue: string;
  labelSelector: string | string[];
  fieldSelector: string | string[];
}

const generateApiUrl = (params: KubeApiUrlParams): string => {
  if (!params.apiGroup)
    return `${params.serverUrl}/${params.apiPrefix}/${params.apiVersion}/namespaces/${params.namespace}/${params.resource}`;
  return `${params.serverUrl}/${params.apiPrefix}/${params.apiGroup}/${params.apiVersion}/namespaces/${params.namespace}/${params.resource}`;
};

export const list = async (
  { urlParams, opts }: RequestBase,
  query?: Partial<QueryParams>
): Promise<Response> => {
  const url = generateApiUrl(urlParams);
  return new Promise((resolve, reject) => {
    try {
      get(url, opts, (error, response, body) => {
        if (error) throw error;
        if (!response || !body) throw new Error('response or body is empty');
        resolve({
          code: response.statusCode,
          data: body
        });
      });
    } catch (err) {
      reject({
        code: 500,
        error: err
      });
    }
  });
};

export const create = async (
  { urlParams, opts }: RequestBase,
  obj: unknown
) => {
  const url = generateApiUrl(urlParams);
  const data = merge(obj, {
    kind: KindMap[urlParams.resource],
    apiVersion: [urlParams.apiGroup, urlParams.apiVersion].filter(Boolean).join('/'),
    metadata: {
      namespace: urlParams.namespace
    }
  });

  return new Promise((resolve, reject) => {
    try {
      post(url, { body: data, ...opts }, (error, response, body) => {
        if (error) throw error;
        if (!response || !body) throw new Error('response or body is empty');
        resolve({
          code: response.statusCode,
          data: body
        });
      });
    } catch (err) {
      reject({
        code: 500,
        error: err
      });
    }
  });
};
