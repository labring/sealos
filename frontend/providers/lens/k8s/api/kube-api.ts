import { KubeObject, KubeObjectConstructorData } from "@/k8slens/kube-object";
import * as request from "request";
import { BasicRespond } from "@/service/respond";
import { Resource } from "../types/types";

export type KubeObjectConstructor<K extends KubeObject, Data> = (new (
  data: Data
) => K) &
  KubeObjectConstructorData;

type KubeApiParams = KubeApiUrlParams & {
  readonly kind: string;
  readonly requestOpts: request.Options;
};

export type SpecificKubeApiUrlParams = {
  readonly serverUrl: string;
  readonly requestOpts: request.Options;
  readonly namespace: string;
};

export type KubeApiUrlParams = {
  serverUrl: string;
  apiPrefix: string;
  apiGroup: string;
  apiVersion: string;
  namespace: string;
  resource: Resource;
};

export class KubeApi {
  readonly requestOpts: request.Options;
  readonly kind: string;
  readonly apiUrl: string;

  constructor(opts: KubeApiParams) {
    this.requestOpts = opts.requestOpts;
    this.kind = opts.kind;
    this.apiUrl = KubeApi.generateApiBaseUrl(opts);
  }

  protected static generateApiBaseUrl(params: KubeApiUrlParams): string {
    if (!params.apiGroup || params.apiGroup === "")
      return `${params.serverUrl}/${params.apiPrefix}/${params.apiVersion}/namespaces/${params.namespace}/${params.resource}`;
    return `${params.serverUrl}/${params.apiPrefix}/${params.apiGroup}/${params.apiVersion}/namespaces/${params.namespace}/${params.resource}`;
  }

  async list(): Promise<BasicRespond> {
    return new Promise((resolve, _) => {
      request.get(this.apiUrl, this.requestOpts, (error, response, body) => {
        if (error) {
          resolve({ code: 500, message: error.message, data: null });
          return;
        }
        if (!response || !body) {
          resolve({
            code: 500,
            message: "Internal Server Error: response or body is empty",
            data: null,
          });
          return;
        }
        resolve({
          code: response.statusCode,
          message: response.statusMessage,
          data: body,
        });
      });
    });
  }
}

export function generateApiBaseUrl(params: KubeApiUrlParams): string {
  if (!params.apiGroup || params.apiGroup === "")
    return `${params.serverUrl}/${params.apiPrefix}/${params.apiVersion}/namespaces/${params.namespace}/${params.resource}`;
  return `${params.serverUrl}/${params.apiPrefix}/${params.apiGroup}/${params.apiVersion}/namespaces/${params.namespace}/${params.resource}`;
}
