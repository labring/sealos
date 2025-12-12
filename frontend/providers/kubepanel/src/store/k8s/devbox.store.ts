import { Devbox } from '@/k8slens/kube-object/src/specifics/devbox';
import { KubeStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';

export const useDevboxStore = create<KubeStore<Devbox>>()((...a) => ({
  ...createKubeStoreSlice<Devbox>(Devbox.kind, Devbox)(...a)
}));
