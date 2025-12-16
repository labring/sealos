import { Service } from '@/k8slens/kube-object';
import { ServiceStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';

export const useServiceStore = create<ServiceStore>()((...a) => ({
  ...createKubeStoreSlice<Service>(Service.kind, Service)(...a)
}));
