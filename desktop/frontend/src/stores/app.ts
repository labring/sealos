import { current } from 'immer';
import request from 'services/request';
import create from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type TAppFront = {
  isShow?: boolean;
  zIndex?: number;
  size: 'maximize' | 'maxmin' | 'minimize';
  style?:
    | {
        width: number | string;
        height: number | string;
        isFull: boolean;
        bg: string;
      }
    | {};
};

const initialFrantState: TAppFront = {
  isShow: false,
  zIndex: 1,
  size: 'maximize',
  style: {}
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
    [key: string]: string;
  };
  // 应用截图
  gallery: string[];
  extra?: {};
} & TAppFront;

type TOSState = {
  // 已安装的应用
  installedApps: TApp[];

  // 所有app store中的应用
  allApps: TApp[];

  // 打开的应用
  openedApps: TApp[];

  // 当前应用
  currentApp?: TApp;

  // 应用详情

  // desktop 初始化
  init(): void;

  // 获取store中的apps
  getAllApps(): void;

  // 关闭应用
  closeApp(name: string): void;

  // 打开应用
  openApp(app: TApp): void;

  // 切换应用
  switchApp(app: TApp): void;

  // 更新应用信息
  updateAppInfo(app: TApp): void;

  // 安装应用
  installApp(app: TApp): void;
  // 打开应用
  openApp(app: TApp): void;
  // 当前最前应用
  maxZIndex: number;

  // start menu
  isHideStartMenu: boolean;

  toggleStartMenu(): void;
};

const useAppStore = create<TOSState>()(
  devtools(
    immer((set, get) => ({
      installedApps: [],
      openedApps: [],
      currentApp: undefined,
      maxZIndex: 0,
      isHideStartMenu: true,
      allApps: [],

      // 初始化
      init: async () => {
        const res = await request('/api/desktop/getInstalledApps');

        set((state) => {
          state.installedApps = res.data.map((item: TApp) => {
            return {
              ...item,
              ...initialFrantState
            };
          });
          state.maxZIndex = 0;
        });
      },

      // 关闭应用
      closeApp: (name: string) => {
        set((state) => {
          state.openedApps = state.openedApps.filter((app) => app.name !== name);
        });
      },

      // 添加应用
      installApp: (app: TApp) => {
        set((state) => {
          state.installedApps = [...state.installedApps, { ...app, ...initialFrantState }];
        });
      },

      // 获取所有应用

      getAllApps: async () => {
        const res = await request('/api/desktop/getAllApps');

        set((state) => {
          state.allApps = res?.data || [];
        });
        return res;
      },
      // 更新应用信息
      updateAppInfo: (app: TApp) => {
        set((state) => {
          state.openedApps = state.openedApps.map((_app) => {
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
        const zIndex = (get().maxZIndex || 0) + 1;
        const _app: TApp = JSON.parse(JSON.stringify(app));
        _app.zIndex = zIndex;
        _app.isShow = true;
        _app.size = 'maximize';

        set((state) => {
          if (!state.openedApps.find((item) => item.name === _app.name)) {
            state.openedApps.push(_app);
          }

          state.currentApp = _app;
          state.maxZIndex = zIndex;
        });
      },

      // switch app
      switchApp: (app: TApp) => {
        const zIndex = (get().maxZIndex || 0) + 1;
        const _app: TApp = JSON.parse(JSON.stringify(app));
        _app.zIndex = zIndex;
        _app.isShow = true;
        if (_app.size === 'minimize') {
          _app.size = 'maximize';
        }
        set((state) => {
          // repalce app info
          state.openedApps = state.openedApps.map((item) => {
            if (item.name === _app.name) {
              return _app;
            }
            return item;
          });

          state.currentApp = _app;
          state.maxZIndex = zIndex;
        });
      },

      toggleStartMenu: () => {
        set((state) => {
          state.isHideStartMenu = !state.isHideStartMenu;
        });
      }
    }))
  )
);

export default useAppStore;
