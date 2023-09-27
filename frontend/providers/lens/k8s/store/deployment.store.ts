import { Deployment, PodStatusPhase } from "@/k8slens/kube-object";
import { GetByLabel } from "./pod.store";
import { ItemStore } from "./data.store";
import { Resource } from "../types/types";

const getChildPods = (getByLabel: GetByLabel, deployment: Deployment) => {
  return getByLabel(deployment.getTemplateLabels()).filter(
    (pod) => pod.getNs() === deployment.getNs()
  );
};

export class DeploymentStore extends ItemStore<Deployment> {
  constructor() {
    super(Resource.Deployments);
  }

  getDeploymentsStatuses(getByLabel: GetByLabel) {
    const status = { running: 0, failed: 0, pending: 0 };

    this.items.forEach((deployment) => {
      const statuses = new Set(
        getChildPods(getByLabel, deployment).map((pod) => pod.getStatus())
      );

      if (statuses.has(PodStatusPhase.FAILED)) {
        status.failed++;
      } else if (statuses.has(PodStatusPhase.PENDING)) {
        status.pending++;
      } else {
        status.running++;
      }
    });

    return status;
  }
}
