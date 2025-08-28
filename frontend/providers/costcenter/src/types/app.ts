export type AppListItem = {
  namespace: string;
  appType: number;
  appName: string;
};

export const AppType = {
  TERMINAL: 'TERMINAL',
  JOB: 'JOB',
  OTHER: 'OTHER',
  OBJECT_STORAGE: 'OBJECT-STORAGE',
  CLOUD_VM: 'CLOUD-VM',
  DB: 'DB',
  APP: 'APP',
  APP_STORE: 'APP-STORE',
  DB_BACKUP: 'DB-BACKUP',
  DEV_BOX: 'DEV-BOX',
  LLM_TOKEN: 'LLM-TOKEN'
} as const;

export type AppType = (typeof AppType)[keyof typeof AppType];
