import { Cluster } from '@/k8slens/kube-object/src/specifics/cluster';
import { KubeStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';

export const useClusterStore = create<KubeStore<Cluster>>()((...a) => ({
  ...createKubeStoreSlice<Cluster>(Cluster.kind, Cluster)(...a)
}));
