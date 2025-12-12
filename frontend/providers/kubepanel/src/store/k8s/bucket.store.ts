import { Bucket } from '@/k8slens/kube-object/src/specifics/bucket';
import { KubeStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';

export const useBucketStore = create<KubeStore<Bucket>>()((...a) => ({
  ...createKubeStoreSlice<Bucket>(Bucket.kind, Bucket)(...a)
}));
