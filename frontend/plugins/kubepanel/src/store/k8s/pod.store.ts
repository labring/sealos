import { Pod } from '@/k8slens/kube-object';
import { PodStore, StatusesComputed } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';
import { countBy } from 'lodash';
import { computed } from 'zustand-computed';

const computeState = (state: PodStore): StatusesComputed => {
  return {
    getStatuses: countBy(state.items, (pod) => pod.getStatus())
  };
};

export const usePodStore = create<PodStore>()(
  computed(
    (...a) => ({
      ...createKubeStoreSlice<Pod>(Pod.kind, Pod)(...a)
    }),
    computeState
  )
);

export function getPodsByOwnerId(pods: Pod[], workloadId: string): Pod[] {
  return pods.filter((pod) => {
    return pod.getOwnerRefs().find((owner) => owner.uid === workloadId);
  });
}
