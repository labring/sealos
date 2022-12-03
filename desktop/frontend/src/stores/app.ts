import { APPTYPE } from 'constants/app_type';
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
  // app name
  name: string;
  // app icon
  icon: string;
  // app type, app： build-in app，iframe：external app
  type: APPTYPE;
  // app info
  data: {
    url: string;
    desc: string;
    [key: string]: string;
  };
  // app gallery
  gallery: string[];
  extra?: {};
  // app top info
  menu?: {
    nameColor: string;
    helpDropDown: boolean;
    helpDocs: boolean;
  };
} & TAppFront;

type TOSState = {
  installedApps: TApp[];

  // all apps in app store
  allApps: TApp[];

  openedApps: TApp[];

  // pinned Dock's app
  pinnedApps: TApp[];

  currentApp?: TApp;

  // init desktop
  init(): void;

  // get all apps of the app store
  getAllApps(): void;

  // close the current app
  closeApp(name: string): void;

  // open the app
  openApp(app: TApp): void;

  // switch the app
  switchApp(app: TApp): void;

  updateAppInfo(app: TApp): void;

  installApp(app: TApp): void;

  // the closet app to the user
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
      pinnedApps: [],
      currentApp: undefined,
      maxZIndex: 0,
      isHideStartMenu: true,
      allApps: [],

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

      closeApp: (name: string) => {
        set((state) => {
          state.openedApps = state.openedApps.filter((app) => app.name !== name);
        });
      },

      installApp: (app: TApp) => {
        set((state) => {
          state.installedApps = [...state.installedApps, { ...app, ...initialFrantState }];
        });
      },

      getAllApps: async () => {
        const res = await request('/api/desktop/getAllApps');

        set((state) => {
          state.allApps = res?.data || [];
        });
        return res;
      },
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

      openApp: async (app: TApp) => {
        const zIndex = (get().maxZIndex || 0) + 1;
        const _app: TApp = JSON.parse(JSON.stringify(app));
        if (_app.type === APPTYPE.LINK) {
          window.open(_app.data.url, '_blank');
          return;
        }
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
