export type AppListItem = {
  namespace: string;
  appType: number;
  appName: string;
};

export const AppType = {
  LLM_TOKEN: 'LLM-TOKEN',
  APP_STORE: 'APP-STORE',
  APP: 'APP',
  CLOUD_VM: 'CLOUD-VM',
  JOB: 'JOB',
  DB_BACKUP: 'DB-BACKUP',
  DB: 'DB',
  DEV_BOX: 'DEV-BOX',
  OBJECT_STORAGE: 'OBJECT-STORAGE',
  TERMINAL: 'TERMINAL',
  OTHER: 'OTHER'
} as const;

export type AppType = (typeof AppType)[keyof typeof AppType];
