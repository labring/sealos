import { PodStatusPhase, StatefulSet } from '@/k8slens/kube-object';
import { GetPodsByOwnerId } from './pod.store';
import { ItemStore } from './data.store';
import { Resources } from '@/constants/kube-object';

export class StatefulSetStore extends ItemStore<StatefulSet> {
  constructor() {
    super(Resources.StatefulSets);
  }

  getStatefulSetsStatuses(getPodsByOwnerId: GetPodsByOwnerId) {
    const status = { running: 0, failed: 0, pending: 0 };

    for (const statefulSet of this.items) {
      const statuses = new Set(getPodsByOwnerId(statefulSet.getId()).map((pod) => pod.getStatus()));

      if (statuses.has(PodStatusPhase.FAILED)) {
        status.failed++;
      } else if (statuses.has(PodStatusPhase.PENDING)) {
        status.pending++;
      } else {
        status.running++;
      }
    }

    return status;
  }
}
