import { Pod } from '@/k8slens/kube-object';
import { PodStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';
import { countBy } from 'lodash';

export const usePodStore = create<PodStore>()((...a) => ({
  ...createKubeStoreSlice<Pod>(Pod.kind, Pod)(...a)
}));

export function getPodsByOwnerId(pods: Pod[], workloadId: string): Pod[] {
  return pods.filter((pod) => {
    return pod.getOwnerRefs().find((owner) => owner.uid === workloadId);
  });
}
