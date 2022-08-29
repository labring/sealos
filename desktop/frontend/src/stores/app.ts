import defaultApps from '@/components/desktop_content/deskApps';
import create from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface OSState {
  apps: any[];
  init: () => void;
}

const useAppStore = create<OSState>()(
  devtools(
    immer((set) => ({
      apps: defaultApps,
      init: () => {
        set((state) => {
          state.apps = [];
        });
      }
    }))
  )
);

export default useAppStore;
