import { ServiceStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';
import { Service } from '@/k8slens/kube-object';

export const useServiceStore = create<ServiceStore>()((...a) => ({
  ...createKubeStoreSlice<Service>(Service.kind, Service)(...a)
}));
