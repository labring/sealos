import { Resource } from "../types/types";
import { KubeApi, SpecificKubeApiUrlParams } from "./kube-api";

const urlParams = {
  apiPrefix: "apis",
  apiGroup: "apps",
  apiVersion: "v1",
  resource: Resource.StatefulSets,
};

export class StatefulSetApi extends KubeApi {
  constructor(opts: SpecificKubeApiUrlParams) {
    super({
      ...urlParams,
      ...opts,
      kind: "StatefulSet",
    });
  }
}
