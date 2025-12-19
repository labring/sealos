import { PersistentVolumeClaim } from '@/k8slens/kube-object';
import { VolumeClaimStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';

export const useVolumeClaimStore = create<VolumeClaimStore>()((...a) => ({
  ...createKubeStoreSlice<PersistentVolumeClaim>(
    PersistentVolumeClaim.kind,
    PersistentVolumeClaim
  )(...a)
}));
