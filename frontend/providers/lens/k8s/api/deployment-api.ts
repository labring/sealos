import { Resource } from "../types/types";
import { KubeApi, SpecificKubeApiUrlParams } from "./kube-api";

const urlParams = {
  apiPrefix: "apis",
  apiGroup: "apps",
  apiVersion: "v1",
  resource: Resource.Deployments,
};

export class DeploymentApi extends KubeApi {
  constructor(opts: SpecificKubeApiUrlParams) {
    super({
      ...urlParams,
      ...opts,
      kind: "Deployment",
    });
  }
}
