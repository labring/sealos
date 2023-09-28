import { Resource } from "../types/types";
import { KubeApi, SpecificKubeApiUrlParams } from "./kube-api";

const urlParams = {
  apiPrefix: "api",
  apiGroup: "",
  apiVersion: "v1",
  resource: Resource.ConfigMaps,
};

export class ConfigMapApi extends KubeApi {
  constructor(opts: SpecificKubeApiUrlParams) {
    super({
      ...urlParams,
      ...opts,
      kind: "ConfigMap",
    });
  }
}
