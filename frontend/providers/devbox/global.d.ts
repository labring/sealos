import { AppConfig } from './types/config';

declare global {
  var __APP_CONFIG__: Readonly<AppConfig> | undefined;
}

export {};
