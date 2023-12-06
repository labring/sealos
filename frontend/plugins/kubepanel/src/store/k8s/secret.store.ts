import { Secret } from '@/k8slens/kube-object';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';
import { SecretStore } from '@/types/state';

export const useSecretStore = create<SecretStore>()((...a) => ({
  ...createKubeStoreSlice<Secret>(Secret.kind)(...a)
}));
