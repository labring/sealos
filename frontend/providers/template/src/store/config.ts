import { getSystemConfig } from '@/api/platform';
import { SystemConfigType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  systemConfig: SystemConfigType | undefined;
  initSystemConfig: () => Promise<SystemConfigType>;
};

export const useSystemConfigStore = create<State>()(
  devtools(
    immer((set, get) => ({
      systemConfig: undefined,
      async initSystemConfig() {
        const data = await getSystemConfig();
        set((state) => {
          state.systemConfig = data;
        });
        return data;
      }
    }))
  )
);
