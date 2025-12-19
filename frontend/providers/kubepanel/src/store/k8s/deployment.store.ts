import { Deployment, Pod, PodStatusPhase } from '@/k8slens/kube-object';
import { DeploymentStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice, getByLabel } from './kube.store';

export function getDeploymentsStatuses(deps: Deployment[], pods: Pod[]) {
  const status = { running: 0, failed: 0, pending: 0 };

  deps.forEach((deployment) => {
    const statuses = new Set(
      getByLabel(pods, deployment.getTemplateLabels()).map((pod) => pod.getStatus())
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

export const useDeploymentStore = create<DeploymentStore>()((...a) => ({
  ...createKubeStoreSlice<Deployment>(Deployment.kind, Deployment)(...a)
}));
