import type { AppConfig } from './src/types/config';

declare global {
  var __APP_CONFIG__: Readonly<AppConfig> | undefined;
  var feishuClient: any;
}

export {};
