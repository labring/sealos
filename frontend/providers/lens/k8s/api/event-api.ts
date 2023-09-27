import { Resource } from "../types/types";
import { KubeApi, SpecificKubeApiUrlParams } from "./kube-api";

const urlParams = {
  apiPrefix: "api",
  apiGroup: "",
  apiVersion: "v1",
  resource: Resource.Events,
};

export class EventApi extends KubeApi {
  constructor(opts: SpecificKubeApiUrlParams) {
    super({
      ...urlParams,
      ...opts,
      kind: "Event",
    });
  }
}
