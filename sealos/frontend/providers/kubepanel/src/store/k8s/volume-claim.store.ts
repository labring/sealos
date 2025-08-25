import { PersistentVolumeClaim } from '@/k8slens/kube-object';
import { createKubeStoreSlice } from './kube.store';
import { VolumeClaimStore } from '@/types/state';
import { create } from 'zustand';

export const useVolumeClaimStore = create<VolumeClaimStore>()((...a) => ({
  ...createKubeStoreSlice<PersistentVolumeClaim>(
    PersistentVolumeClaim.kind,
    PersistentVolumeClaim
  )(...a)
}));
