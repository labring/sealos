import { ResourceListItemType } from '@/types/resource';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  instanceName: string;
  resource: ResourceListItemType[];
  setInstanceName: (instanceName: string) => void;
  appendResource: (data: ResourceListItemType[]) => void;
};

export const useResourceStore = create<State>()(
  devtools(
    immer((set, get) => ({
      instanceName: '',
      resource: [],
      setInstanceName: (instanceName: string) => {
        set((state) => {
          state.instanceName = instanceName;
          state.resource = [];
        });
      },
      appendResource: (data: ResourceListItemType[]) => {
        set((state) => {
          data.forEach((newItem) => {
            const exists = state.resource.some((item) => item.id === newItem.id);
            if (!exists) {
              state.resource.push(newItem);
            }
          });
        });
      }
    }))
  )
);
