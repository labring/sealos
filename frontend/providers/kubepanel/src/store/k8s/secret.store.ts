import { Secret, SecretData } from '@/k8slens/kube-object';
import { SecretStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';

export const useSecretStore = create<SecretStore>()((...a) => ({
  ...createKubeStoreSlice<Secret, SecretData>(Secret.kind, Secret)(...a)
}));
