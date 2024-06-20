import request from '@/services/request';
import { APPTYPE, TApp, TOSState, WindowSize, displayType } from '@/types';
import { formatUrl } from '@/utils/format';
import { cloneDeep, minBy } from 'lodash';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AppStateManager from '../utils/ProcessManager';

export class AppInfo {
  pid: number;
  isShow: boolean;
  zIndex: number;
  size: WindowSize;
  cacheSize: WindowSize;
  style: {};
  mouseDowning: boolean;
  key: `${'user' | 'system'}-${string}`;
  name: string;
  icon: string;
  type: APPTYPE;
  data: {
    url: string;
    desc: string;
  };
  // app gallery
  gallery?: string[];
  extra?: {};
  // app top info
  menuData?: {
    nameColor: string;
    helpDropDown: boolean;
    helpDocs: boolean | string;
  };
  displayType: displayType;
  i18n?: any;

  constructor(app: TApp, pid: number) {
    this.isShow = false;
    this.zIndex = 10; // It cannot be 1 anymore, leaving space for other components
    this.size = 'maximize';
    this.cacheSize = 'maximize';
    this.style = cloneDeep(app.style);
    this.mouseDowning = false;
    this.menuData = cloneDeep(app.menuData);
    this.gallery = cloneDeep(app.gallery);
    this.extra = cloneDeep(app.extra);
    this.data = cloneDeep(app.data);
    this.type = app.type;
    this.icon = app.icon;
    this.name = app.name;
    this.key = app.key;
    this.pid = pid;
    this.displayType = app.displayType;
    this.i18n = app?.i18n;
  }
}

const useAppStore = create<TOSState>()(
  devtools(
    persist(
      immer<TOSState>((set, get) => ({
        installedApps: [],
        runningInfo: [],
        // present of highest layer
        currentAppPid: -1,
        maxZIndex: 10,
        launchQuery: {},
        autolaunch: '',
        runner: new AppStateManager([]),
        async init() {
          const res = await request('/api/desktop/getInstalledApps');
          set((state) => {
            state.installedApps = res?.data?.map((app: TApp) => new AppInfo(app, -1));
            state.runner.loadApps(state.installedApps.map((app) => app.key));
            state.maxZIndex = 10;
          });
          return get();
        },
        // should use pid to close app, but it don't support multi same app process now
        closeAppById: (pid: number) => {
          set((state) => {
            state.runner.closeApp(pid);
            // make sure the process is killed
            state.runningInfo = state.runningInfo.filter((item) => item.pid !== pid);
          });
        },
        closeAppAll: () => {
          set((state) => {
            state.runner.closeAppAll();
            state.runningInfo = [];
          });
        },
        installApp: (app: TApp) => {
          set((state) => {
            state.installedApps.push(new AppInfo(app, -1));
            state.runner.loadApp(app.key);
          });
        },
        findAppInfoById: (pid: number) => {
          // make sure the process is running
          return get().runningInfo.find((item) => item.pid === pid);
        },
        updateOpenedAppInfo: (app: AppInfo) => {
          set((state) => {
            state.runningInfo = state.runningInfo.map((_app) => {
              if (_app.pid === app.pid) {
                return app;
              } else {
                return _app;
              }
            });
          });
        },

        /**
         * update apps mousedown enum. app set to status, other apps set to false
         */
        updateAppsMousedown(app: TApp, status: boolean) {
          set((state) => {
            state.installedApps = state.installedApps.map((_app) => {
              return _app.name === app.name
                ? { ...app, mouseDowning: status }
                : { ..._app, mouseDowning: false };
            });
          });
        },

        openApp: async (app: TApp, { query, raw, pathname = '/', appSize = 'maximize' } = {}) => {
          const zIndex = get().maxZIndex + 1;
          // debugger
          // 未支持多实例
          let alreadyApp = get().runningInfo.find((x) => x.key === app.key);
          if (alreadyApp) {
            get().switchAppById(alreadyApp.pid);
            get().setToHighestLayerById(alreadyApp.pid);
            return;
          }
          // Up to 7 apps &&  one home app
          if (get().runningInfo.length >= 8) {
            get().deleteLeastUsedAppByIndex();
          }
          if (app.type === APPTYPE.LINK) {
            window.open(app.data.url, '_blank');
            return;
          }
          let run_app = get().runner.openApp(app.key);

          const _app = new AppInfo(app, run_app.pid);
          _app.zIndex = zIndex;
          _app.size = appSize;
          _app.isShow = true;
          // add query to url
          if (_app.data?.url) {
            if (query) _app.data.url = formatUrl(_app.data.url + pathname, query);
            else if (raw) {
              _app.data.url += `?${raw}`;
            }
          }

          set((state) => {
            state.runningInfo.push(_app);
            state.currentAppPid = _app.pid;
            state.maxZIndex = zIndex;
          });
        },
        // maximize app
        switchAppById: (pid: number) => {
          set((state) => {
            let _app = state.runningInfo.find((item) => item.pid === pid);
            if (!_app) return;
            _app.isShow = true;
            _app.size = _app.cacheSize;
          });
          get().setToHighestLayerById(pid);
        },
        // get switch floor function
        setToHighestLayerById: (pid: number) => {
          const zIndex = get().maxZIndex + 1;
          set((state) => {
            let _app = state.runningInfo.find((item) => item.pid === pid)!;
            _app.zIndex = zIndex;
            get().updateOpenedAppInfo(_app);
            state.currentAppPid = pid;
            state.maxZIndex = zIndex;
          });
        },
        // currently active app
        currentApp: () => get().findAppInfoById(get().currentAppPid),
        // least used app
        deleteLeastUsedAppByIndex: () => {
          const appToDelete = minBy(get().runningInfo, (app) => app.zIndex);
          get().runningInfo = get().runningInfo.filter((app) => app.pid !== appToDelete?.pid);
        },
        setAutoLaunch(autolaunch, launchQuery) {
          set((state) => {
            state.autolaunch = autolaunch;
            state.launchQuery = launchQuery;
          });
        },
        cancelAutoLaunch: () => {
          set((state) => {
            state.autolaunch = '';
            state.launchQuery = {};
          });
        }
      })),
      {
        name: 'app',
        partialize(state) {
          return {
            launchQuery: state.launchQuery,
            autolaunch: state.autolaunch
          };
        }
      }
    )
  )
);

export default useAppStore;
