import { KubeEvent } from '@/k8slens/kube-object';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';
import { EventStore } from '@/types/state';

export const useEventStore = create<EventStore>()((...a) => ({
  ...createKubeStoreSlice<KubeEvent>(KubeEvent.kind)(...a)
}));
