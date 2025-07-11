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
  orgId: string;
  secretKey: string;
  ui?: {
    theme?: 'light' | 'dark';
    primaryColor?: string;
    language?: string;
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

export interface UploadExcelResp {
  id: number;
}

export interface ExcelProgressResp {
  id: number;
  status: 'running' | 'success' | 'failed';
  attach?: string;
}

/* ---------- 公共类型 ---------- */
export interface RestChatPayload {
  dataSourceId: number; // 数据源 ID
  datasourceType: 'DATA_SOURCE' | 'EXCEL';
  input: string; // 问题
  language?: 'ZH' | 'EN';
  questionType?: 'ORDINARY_CHAT' | 'REPORT_CHAT';
  stream?: boolean; // true = 流式
}

/* ---------- 2. 流式返回（SSE / ReadableStream） ---------- */
export interface StreamHandlers {
  onMessage: (json: any) => void; // 每条 JSON 消息
  onError?: (err: any) => void;
}

export type DatasourceType = 'DATA_SOURCE' | 'EXCEL';

export interface ExecuteSqlPayload {
  /** 数据源中的数据库名（MySQL/PG 库名、ClickHouse DB 等） */
  databaseName: string;
  /** Chat2DB 数据源 ID */
  dataSourceId: number;
  /** SQL / DDL / DML 语句 */
  sql: string;
  /** 数据源类型 */
  datasourceType?: DatasourceType;
}

export interface ColumnMeta {
  name: string;
  dataType: string;
  primaryKey?: boolean;
  comment?: string;
}

export interface SqlResult {
  sql: string;
  description: string;
  success: boolean;
  headerList: ColumnMeta[];
  dataList: (string | number | null)[][];
  pageNo: number;
  pageSize: number;
  hasNextPage: boolean;
  fuzzyTotal: string;
  duration: number; // 执行耗时 ms
  canEdit: boolean;
  tableName?: string;
}

export type ExecuteSqlResp = SqlResult[];

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
  id?: number; // 更新时必填
  alias: string;
  environmentId: 1 | 2; // 1: LOCAL  2: CLOUD
  storageType: 'LOCAL' | 'CLOUD';
  host: string;
  port: string;
  user: string;
  password: string;
  url: string;
  type: DbType;
  authenticationType?: '1' | '2'; // 1=账号密码 2=其它
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

export interface ColumnAlias {
  columnName: string; // 原列名
  columnNameAlias?: string; // 列名别名
  columnComment?: string; // 原注释
  columnCommentAlias?: string; // AI 生成注释
  columnExampleData?: string; // AI 生成示例
  columnEnumMap?: Record<string, string>; // 枚举映射
  foreignTableName?: string;
  foreignColumnName?: string;
  functionExamples?: string;
  deletedFlag?: boolean; // 是否剔除
}

export interface TableCommentExt {
  tableName?: string;
  tableNameAlias?: string;
  tableComment?: string;
  tableCommentAlias?: string;
  columnAlias?: ColumnAlias[];
}

export type TableCommentType = 'TABLE';

/** 请求体结构 */
export interface SaveTableCommentPayload {
  dataSourceId: number;
  databaseName: string;
  schemaName?: string;
  tableName: string;
  refresh?: boolean; // 是否刷新
  tableCommentExt: TableCommentExt;
  type: TableCommentType;
}
