import { Pod, PodStatusPhase, StatefulSet } from '@/k8slens/kube-object';
import { getPodsByOwnerId } from './pod.store';
import { create } from 'zustand';
import { StatefulSetStore } from '@/types/state';
import { createKubeStoreSlice } from './kube.store';

export function getStatefulSetsStatuses(statefulSets: StatefulSet[], pods: Pod[]) {
  const status = { running: 0, failed: 0, pending: 0 };

  for (const statefulSet of statefulSets) {
    const statuses = new Set(
      getPodsByOwnerId(pods, statefulSet.getId()).map((pod) => pod.getStatus())
    );

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

export const useStatefulSetStore = create<StatefulSetStore>()((...a) => ({
  ...createKubeStoreSlice<StatefulSet>(StatefulSet.kind, StatefulSet)(...a)
}));
