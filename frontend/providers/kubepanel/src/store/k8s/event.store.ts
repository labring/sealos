import { KubeEvent, KubeEventData } from '@/k8slens/kube-object';
import { EventStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';

export const useEventStore = create<EventStore>()((...a) => ({
  ...createKubeStoreSlice<KubeEvent, KubeEventData>(KubeEvent.kind, KubeEvent)(...a)
}));
