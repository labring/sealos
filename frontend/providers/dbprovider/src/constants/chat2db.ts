export interface ILayoutState {
  hideAvatar?: boolean;
}

export interface IUrlParams extends ILayoutState {
  theme?: ThemeAppearance;
  primaryColor?: PrimaryColorsType;
  language?: LangType;
}

export enum ThemeAppearance {
  Light = 'light',
  Dark = 'dark',
  DarkDimmed = 'dark_dimmed',
  Auto = 'auto'
}

export enum PrimaryColorsType {
  purple = 'purple',
  blue = 'blue',
  bw = 'bw',
  cyan = 'cyan',
  geekblue = 'geekblue',
  gold = 'gold',
  green = 'green',
  lime = 'lime',
  orange = 'orange',
  red = 'red',
  magenta = 'magenta'
}

export enum LangType {
  EN_US = 'en-US',
  ZH_CN = 'zh-CN',
  JA_JP = 'ja-JP'
}

export const urlParamsDefault: IUrlParams = {
  theme: ThemeAppearance.Light,
  primaryColor: PrimaryColorsType.purple
};

export const yowantLayoutConfig: ILayoutState = {
  hideAvatar: true
};

export const CHAT2DB_BASE_URL = process.env.NEXT_PUBLIC_CHAT2DB_URL || 'https://app.chat2db-ai.com';

export function buildChat2DBUrl(params: Partial<IUrlParams> = {}): string {
  const finalParams: IUrlParams = {
    ...urlParamsDefault,
    ...yowantLayoutConfig,
    ...params
  };

  const search = new URLSearchParams();
  if (finalParams.theme) {
    search.set('theme', finalParams.theme);
  }
  if (finalParams.primaryColor) {
    search.set('primaryColor', finalParams.primaryColor);
  }
  if (finalParams.language) {
    search.set('language', finalParams.language);
  }
  if (typeof finalParams.hideAvatar === 'boolean') {
    search.set('hideAvatar', String(finalParams.hideAvatar));
  }

  return `${CHAT2DB_BASE_URL}?${search.toString()}`;
}

export type Chat2DBMessage =
  | { type: 'change_theme'; theme: ThemeAppearance }
  | { type: 'change_primary_color'; primaryColor: PrimaryColorsType }
  | { type: 'change_language'; language: LangType }
  | { type: 'change_layout_config'; layoutConfig: ILayoutState };
