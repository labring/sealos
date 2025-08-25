import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { displayType } from '@/types';

type AppDisplayState = {
  appDisplayConfigs: Record<string, displayType>;
  backgroundImage: string;
  updateAppDisplayType: (appKey: string, displayType: displayType) => void;
  resetAppDisplayConfigs: () => void;
  updateBackgroundImage: (image: string) => void;
};

export const useAppDisplayConfigStore = create<AppDisplayState>()(
  persist(
    immer((set) => ({
      appDisplayConfigs: {},
      backgroundImage: '/images/bg-light.svg',
      updateAppDisplayType: (appKey: string, displayType: displayType) => {
        set((state) => {
          state.appDisplayConfigs[appKey] = displayType;
        });
      },
      resetAppDisplayConfigs: () => {
        set((state) => {
          state.appDisplayConfigs = {};
        });
      },
      updateBackgroundImage: (image: string) => {
        set((state) => {
          state.backgroundImage = image;
        });
      }
    })),
    {
      name: 'app-display-config'
    }
  )
);
