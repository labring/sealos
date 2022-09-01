import request from 'services/request';
import create from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type TAppFront = {
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

export type TApp = {
  // 应用名称
  name: string;
  // 应用 icon
  icon: string;
  // 应用类型, app： 内置应用，iframe：外部应用
  type: 'app' | 'iframe';
  // 应用信息
  data: {
    url: string;
    desc: string;
  };
  // 应用截图
  gallery: string[];
  extra?: {};
} & TAppFront;

type TOSState = {
  // 已安装的应用
  installedApps: TApp[];

  // 打开的应用
  opendApps: TApp[];

  // 当前应用
  currentApp?: TApp;

  // desktop 初始化
  init: () => void;

  // 关闭应用
  closeApp: (name: string) => void;

  // 打开应用
  openApp: (app: TApp) => void;

  // 更新应用信息
  updateAppInfo: (app: TApp) => void;
};

const useAppStore = create<TOSState>()(
  devtools(
    immer((set, get) => ({
      installedApps: [],
      opendApps: [],
      currentApp: undefined,

      // 初始化
      init: async () => {
        const res = await request('/api/mock/getInstalledApps');
        console.log(12123, res);

        set((state) => {
          state.installedApps = res.data;
        });
      },

      // 关闭应用
      closeApp: (name: string) => {
        set((state) => {
          state.opendApps = state.opendApps.filter((app) => app.name !== name);
        });
      },

      // 更新应用信息
      updateAppInfo: (app: TApp) => {
        const _apps = get().installedApps;
        set((state) => {
          state.opendApps = state.opendApps.map((_app) => {
            if (_app.name === app.name) {
              return app;
            }
            return _app;
          });

          state.installedApps = state.installedApps.map((_app) => {
            if (_app.name === app.name) {
              return app;
            }
            return _app;
          });
        });
      },

      // 打开应用
      openApp: async (app: TApp) => {
        set((state) => {
          state.currentApp = app;
          state.opendApps.push(app);
        });
      }
    }))
  )
);

export default useAppStore;
