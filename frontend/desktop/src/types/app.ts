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
    // [key: string]: string;
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
};
export const initialFrantState: TAppFront = {
  isShow: false,
  zIndex: 1,
  size: 'maximize',
  cacheSize: 'maximize',
  style: {},
  mouseDowning: false
};

export type TApp = TAppConfig & TAppFront;
export type Pid = number;
export type TOSState = {
  installedApps: TApp[];

  orderApps: { [key: string]: number };

  // all apps in app store
  allApps: TApp[];

  openedApps: TApp[];

  // pinned Dock's app
  pinnedApps: TApp[];

  currentApp?: TApp;

  // init desktop
  init(): Promise<void>;

  // get all apps of the app store
  getAllApps(): void;

  // close the current app
  closeApp(name: string): void;

  // open the app
  openApp(app: TApp, query?: Record<string, string>): void;

  // switch the app
  switchApp(app: TApp, type?: 'clickMask'): void;

  updateOpenedAppInfo(app: TApp): void;

  // update app order in desktop
  updateAppOrder(app: TApp, i: number): void;

  updateAppsMousedown(app: TApp, status: boolean): void;

  installApp(app: TApp): void;

  // the closet app to the user
  maxZIndex: number;

  // start menu
  isHideStartMenu: boolean;

  toggleStartMenu(): void;
};
