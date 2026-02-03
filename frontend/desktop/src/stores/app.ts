import request from '@/services/request';
import { APPTYPE, TApp, TAppMenuData, TOSState, WindowSize, displayType } from '@/types';
import { formatUrl } from '@/utils/format';
import { cloneDeep, minBy } from 'lodash';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AppStateManager from '../utils/ProcessManager';
import { useDesktopConfigStore } from './desktopConfig';
import { track } from '@sealos/gtm';
import useSessionStore from './session';

export const BRAIN_APP_KEY = 'system-brain';
export const SESSION_RESTORE_APP_KEY = 'sealos_desktop_restore_app_key';

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
  menuData?: TAppMenuData[];
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
        currentAppKey: '',
        maxZIndex: 10,
        launchQuery: {},
        autolaunch: '',
        autolaunchWorkspaceUid: '',
        autoDeployTemplate: '',
        autoDeployTemplateForm: undefined as Record<string, any> | undefined,
        runner: new AppStateManager([]),
        async init() {
          const { isGuest } = useSessionStore.getState();
          let apps: TApp[] = [];
          if (isGuest()) {
            const res = await request('/api/desktop/getDefaultApps');
            apps = res?.data || [];
          } else {
            const res = await request('/api/desktop/getInstalledApps');
            apps = res?.data || [];
          }

          set((state) => {
            state.installedApps = apps.map((app: TApp) => new AppInfo(app, -1));
            state.runner.loadApps(state.installedApps.map((app) => app.key));
            state.maxZIndex = 10;
          });
          return get();
        },
        // should use pid to close app, but it don't support multi same app process now
        closeAppById: (pid: number) => {
          useDesktopConfigStore.getState().temporarilyDisableAnimation();
          set((state) => {
            const closingApp = state.runningInfo.find((item) => item.pid === pid);
            state.runner.closeApp(pid);
            // If closing the current app, clear currentAppKey
            if (closingApp && closingApp.key === state.currentAppKey) {
              state.currentAppKey = '';
            }
            // make sure the process is killed
            state.runningInfo = state.runningInfo.filter((item) => item.pid !== pid);
          });
        },
        closeAppAll: () => {
          set((state) => {
            state.runner.closeAppAll();
            state.runningInfo = [];
            state.currentAppKey = '';
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
            // If updating the current app, update currentAppKey based on size
            if (app.pid === state.currentAppPid) {
              if (app.size === 'maximize') {
                state.currentAppKey = app.key;
              } else {
                state.currentAppKey = '';
              }
            }
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
          console.log('open app: ', app.key);

          useDesktopConfigStore.getState().temporarilyDisableAnimation();
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

          if (_app.data?.url) {
            let finalUrl = _app.data.url;

            if (pathname && pathname !== '/') {
              const baseUrl = finalUrl.endsWith('/') ? finalUrl.slice(0, -1) : finalUrl;
              const normalizedPath = pathname.startsWith('/') ? pathname : '/' + pathname;
              finalUrl = baseUrl + normalizedPath;
            }

            if (raw) {
              finalUrl += finalUrl.includes('?') ? '&' : '?';
              finalUrl += raw;
            } else if (query) {
              finalUrl = formatUrl(finalUrl, query);
            }

            _app.data.url = finalUrl;
          }

          set((state) => {
            state.runningInfo.push(_app);
            state.currentAppPid = _app.pid;
            // Only save currentAppKey when app is maximized
            if (appSize === 'maximize') {
              state.currentAppKey = _app.key;
            }
            state.maxZIndex = zIndex;
          });

          if (app.key.startsWith('system-')) {
            track('module_open', {
              module: app.key.slice(7)
            });
          } else {
            track('app_launch', {
              module: 'desktop',
              app_name: app.name,
              // All icons are from appstore as of now.
              source: 'appstore'
            });
          }
        },
        // open desktop app by app key and pathname, and send message to app
        openDesktopApp: ({
          appKey,
          query = {},
          messageData = {},
          pathname = '/',
          appSize = 'maximize'
        }: {
          appKey: string;
          query?: Record<string, string>;
          messageData?: Record<string, any>;
          pathname: string;
          appSize?: WindowSize;
        }) => {
          console.log('open desktop app: ', appKey);
          const app = get().installedApps.find((item) => item.key === appKey);
          const runningApp = get().runningInfo.find((item) => item.key === appKey);

          if (!app) return;

          get().openApp(app, { query, pathname, appSize });

          if (runningApp) {
            get().setToHighestLayerById(runningApp.pid);
          }

          const iframe = document.getElementById(`app-window-${appKey}`) as HTMLIFrameElement;
          if (!iframe) return;
          iframe.contentWindow?.postMessage(messageData, app.data.url);
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
            // Only save currentAppKey when app is maximized
            if (_app.size === 'maximize') {
              state.currentAppKey = _app.key;
            } else {
              state.currentAppKey = '';
            }
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
        setAutoLaunch(autolaunch, launchQuery, autolaunchWorkspaceUid) {
          set((state) => {
            state.autolaunch = autolaunch;
            state.launchQuery = launchQuery;
            state.autolaunchWorkspaceUid = autolaunchWorkspaceUid;
          });
        },
        cancelAutoLaunch: () => {
          set((state) => {
            state.autolaunch = '';
            state.launchQuery = {};
            state.autolaunchWorkspaceUid = '';
          });
        },
        setAutoDeployTemplate(templateName: string, templateForm: Record<string, any>) {
          set((state) => {
            state.autoDeployTemplate = templateName;
            state.autoDeployTemplateForm = templateForm;
          });
        },
        cancelAutoDeployTemplate: () => {
          set((state) => {
            state.autoDeployTemplate = '';
            state.autoDeployTemplateForm = undefined;
          });
        }
      })),
      {
        name: 'app',
        version: 1,
        migrate(persistedState: any) {
          if (persistedState?.currentAppKey && persistedState.currentAppKey !== BRAIN_APP_KEY) {
            return {
              ...persistedState,
              currentAppKey: ''
            };
          }
          return persistedState;
        },
        partialize(state) {
          return {
            launchQuery: state.launchQuery,
            autolaunch: state.autolaunch,
            autoDeployTemplate: state.autoDeployTemplate,
            autoDeployTemplateForm: state.autoDeployTemplateForm,
            // Only Brain can persist across tab close; other apps should rely on sessionStorage.
            currentAppKey: state.currentAppKey === BRAIN_APP_KEY ? state.currentAppKey : ''
          };
        }
      }
    )
  )
);

export default useAppStore;
