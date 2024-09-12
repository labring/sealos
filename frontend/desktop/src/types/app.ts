import { AppInfo } from '@/stores/app';
import AppStateManager from '@/utils/ProcessManager';

export enum APPTYPE {
  APP = 'app',
  IFRAME = 'iframe',
  LINK = 'link'
}

export type WindowSize = 'maximize' | 'maxmin' | 'minimize';
export type displayType = 'normal' | 'hidden' | 'more';

export type TAppFront = {
  isShow: boolean;
  zIndex: number;
  size: WindowSize;
  cacheSize: WindowSize;
  style: {
    width?: number | string;
    height?: number | string;
    isFull?: boolean;
    bg?: string;
  };
  mouseDowning: boolean;
};

export type TAppMenuData = {
  name: string;
  link: string;
};

export type TAppConfig = {
  // app key
  key: `${'user' | 'system'}-${string}`;
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
  };
  // app gallery
  gallery?: string[];
  extra?: {};
  // app top info
  menuData?: TAppMenuData[];
  i18n?: {
    [key: string]: {
      name: string;
    };
  };
  displayType: displayType;
};

export type TApp = TAppConfig & TAppFront & { pid: number };

export type TOSState = {
  maxZIndex: number;
  installedApps: TApp[];
  runner: AppStateManager;
  runningInfo: AppInfo[];
  currentAppPid: number;
  autolaunch: string;
  autolaunchWorkspaceUid?: string;
  launchQuery: Record<string, string>;
  // store deploy template
  setAutoLaunch: (
    autolaunch: string,
    launchQuery: Record<string, string>,
    autolaunchWorkspaceId?: string
  ) => void;
  cancelAutoLaunch: () => void;
  // init desktop
  init(): Promise<TOSState>;
  // open app
  openApp(
    app: TApp,
    _query?: {
      query?: Record<string, string>;
      raw?: string;
      pathname?: string;
      appSize?: WindowSize;
    }
  ): Promise<void>;
  // close app
  closeAppById: (pid: number) => void;
  closeAppAll: () => void;
  // get current runningApp
  currentApp: () => AppInfo | undefined;
  switchAppById: (pid: number) => void;
  findAppInfoById: (pid: number) => AppInfo | undefined;
  setToHighestLayerById: (pid: number) => void;
  updateOpenedAppInfo: (app: TApp) => void;
  deleteLeastUsedAppByIndex: () => void;
};
