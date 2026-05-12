import { WorkspaceQuotaItem } from './user';

export type Method =
  | 'get'
  | 'GET'
  | 'delete'
  | 'DELETE'
  | 'head'
  | 'HEAD'
  | 'options'
  | 'OPTIONS'
  | 'post'
  | 'POST'
  | 'put'
  | 'PUT'
  | 'patch'
  | 'PATCH'
  | 'purge'
  | 'PURGE'
  | 'link'
  | 'LINK'
  | 'unlink'
  | 'UNLINK';

export type MasterOptions = {
  allowedOrigins: string[];
  getWorkspaceQuotaApi: () => Promise<WorkspaceQuotaItem[]>;
  getHostConfigApi?: () => Promise<{
    cloud: {
      domain: string;
      port: string;
      regionUid: string;
    };
    features: {
      subscription: boolean;
    };
  }>;
};

export type WindowSize = 'maximized' | 'windowed' | 'minimized';

export type OpenAppOptions = {
  appKey: string;
  query?: Record<string, string>;
  messageData?: Record<string, any>;
  pathname?: string;
  appSize?: WindowSize;
};
