export interface ILayoutState {
  hideAvatar?: boolean;
}

export interface IUrlParams extends ILayoutState {
  theme?: ThemeAppearance;
  primaryColor?: PrimaryColorsType;
  language?: LangType;
}

export interface GenerateLoginUrlOpts {
  userId: string;
  userNS: string;
  orgId: string;
  secretKey: string;
  ui?: {
    theme?: 'light' | 'dark';
    primaryColor?: string;
    language?: LangType;
    hideAvatar?: boolean;
  };
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

export interface UserInfo {
  uid: string;
  registerType?: string;
  isAdmin?: boolean;
}

export type DbType =
  | 'MYSQL'
  | 'POSTGRESQL'
  | 'CLICKHOUSE'
  | 'MONGODB'
  | 'SNOWFLAKE'
  | 'ORACLE'
  | 'SQLSERVER'
  | 'SQLITE'
  | 'REDIS'
  | 'DM'
  | 'HIVE'
  | 'KINGBASE'
  | 'OPENGAUSS'
  | 'OCEANBASE'
  | 'H2'
  | 'DB2'
  | 'DUCKDB'
  | 'GAUSSDB';

export interface DatasourceForm {
  id?: number | string;
  alias?: string;
  environmentId: 1 | 2;
  storageType: 'LOCAL' | 'CLOUD';
  host: string;
  port: string;
  user: string;
  password: string;
  url: string;
  type: string;
  authenticationType?: '1' | '2';
}

export interface CreateApiResponse {
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  errorDetail: string | null;
  solutionLink: string | null;
  data: number;
  traceId: string | null;
}

export interface DatasourceItem {
  id: number;
  alias: string;
  type: DbType;
  host: string;
  port: string;
  environmentId: number;
  storageType: string;
}

export interface DatasourceListResp {
  data: DatasourceItem[];
  pageNo: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export interface DatasourceDelete {
  id: number;
}

const DB_TYPE_MAP: Record<string, string> = {
  mysql: 'MySQL',
  clickhouse: 'ClickHouse',
  mongodb: 'MongoDB',
  snowflake: 'Snowflake',
  h2: 'H2',
  oracle: 'Oracle',
  postgresql: 'PostgreSQL',
  dm: 'DM',
  oceanbase: 'OceanBase',
  hive: 'HIVE',
  kingbase: 'Kingbase',
  redis: 'Redis',
  opengauss: 'OpenGauss',
  sqlserver: 'SQLServer',
  sqlite: 'SQLite',
  db2: 'DB2',
  duckdb: 'DuckDB',
  gaussdb: 'GaussDB'
};

/**
 * Convert function
 * @param dbType local lowercase string, such as 'mysql'
 * @returns the name required by the interface; if no mapping, return the original string
 */
export function mapDBType(dbType: string): string {
  return DB_TYPE_MAP[dbType.toLowerCase()] ?? dbType;
}
