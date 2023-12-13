import { IngressStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';
import { Ingress } from '@/k8slens/kube-object';

export const useIngressStore = create<IngressStore>()((...a) => ({
  ...createKubeStoreSlice<Ingress>(Ingress.kind, Ingress)(...a)
}));
