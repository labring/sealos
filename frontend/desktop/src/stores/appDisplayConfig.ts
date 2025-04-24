import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { displayType } from '@/types';

type AppDisplayState = {
  appDisplayConfigs: Record<string, displayType>;
  updateAppDisplayType: (appKey: string, displayType: displayType) => void;
  resetAppDisplayConfigs: () => void;
};

export const useAppDisplayConfigStore = create<AppDisplayState>()(
  persist(
    immer((set) => ({
      appDisplayConfigs: {},
      updateAppDisplayType: (appKey: string, displayType: displayType) => {
        set((state) => {
          state.appDisplayConfigs[appKey] = displayType;
        });
      },
      resetAppDisplayConfigs: () => {
        set((state) => {
          state.appDisplayConfigs = {};
        });
      }
    })),
    {
      name: 'app-display-config'
    }
  )
);
