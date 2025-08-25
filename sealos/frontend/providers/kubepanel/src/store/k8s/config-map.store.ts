import { ConfigMap } from '@/k8slens/kube-object';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';
import { ConfigMapStore } from '@/types/state';

export const useConfigMapStore = create<ConfigMapStore>()((...a) => ({
  ...createKubeStoreSlice<ConfigMap>(ConfigMap.kind, ConfigMap)(...a)
}));
