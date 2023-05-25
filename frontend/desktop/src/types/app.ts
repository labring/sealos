import { AppInfo } from '@/stores/app';
import AppStateManager from '@/utils/ProcessManager';

export enum APPTYPE {
  APP = 'app',
  IFRAME = 'iframe',
  LINK = 'link'
}

export type WindowSize = 'maximize' | 'maxmin' | 'minimize';

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

export type TAppConfig = {
  // app key
  key: string;
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
  gallery: string[];
  extra?: {};
  // app top info
  menuData?: {
    nameColor: string;
    helpDropDown: boolean;
    helpDocs: boolean | string;
  };
  displayType: 'normal' | 'hidden' | 'more ';
};

export type TApp = TAppConfig & TAppFront & { pid: number };

export type TOSState = {
  maxZIndex: number;
  installedApps: TApp[];
  runner: AppStateManager;
  runningInfo: AppInfo[];
  currentAppPid: number;
  // init desktop
  init(): Promise<void>;
  // open app
  openApp(app: TApp, query?: Record<string, string>): Promise<void>;
  // close app
  closeAppById: (pid: number) => void;
  // get current runningApp
  currentApp: () => AppInfo | undefined;
  switchAppById: (pid: number) => void;
  findAppInfoById: (pid: number) => AppInfo | undefined;
  setToHighestLayerById: (pid: number) => void;
  updateOpenedAppInfo: (app: TApp) => void;
  deleteLeastUsedAppByIndex: () => void;
};
