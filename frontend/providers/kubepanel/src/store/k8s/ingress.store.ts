import { Ingress } from '@/k8slens/kube-object';
import { IngressStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';

export const useIngressStore = create<IngressStore>()((...a) => ({
  ...createKubeStoreSlice<Ingress>(Ingress.kind, Ingress)(...a)
}));
