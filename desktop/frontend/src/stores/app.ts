import defaultApps from '@/components/desktop_content/deskApps';
import create from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type TApp = {
  name: string;
  icon: string;
  type: 'app' | 'iframe';
  data: {
    url: string;
    desc: string;
  };
  gallery: string[];
  extra?: {};
  isShow?: boolean;
  zIndex?: number;
  size: 'full' | 'small';
  style?: {
    width: number;
    height: number;
    isFull: boolean;
    bg: string;
  };
};

type TOSState = {
  apps: TApp[];
  opendApps: TApp[];
  currentApp?: TApp;
  init: () => void;
  closeApp: (name: string) => void;
  openApp: (app: TApp) => void;
};

const useAppStore = create<TOSState>()(
  devtools(
    immer((set) => ({
      apps: defaultApps,
      opendApps: [],
      currentApp: undefined,

      // 初始化
      init: () => {
        set((state) => {
          state.apps = [];
        });
      },

      // 关闭应用
      closeApp: (name: string) => {
        set((state) => {
          state.opendApps = state.opendApps.filter((app) => app.name !== name);
          console.log(123, state.opendApps);
        });
      },

      // 打开应用
      openApp: (app: TApp) => {
        set((state) => {
          state.currentApp = app;
          state.opendApps.push(app);
        });
      }
    }))
  )
);

export default useAppStore;
