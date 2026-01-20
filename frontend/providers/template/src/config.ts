import { AppConfig } from './types/config';

export const Config = new Proxy(
  {},
  {
    get(_t, p: keyof AppConfig) {
      const cfg = globalThis.__APP_CONFIG__;
      if (!cfg) {
        console.error(
          '[App Config] config not initialized, this should not happen in normal flow.'
        );
        process.exit(1);
      }
      return cfg[p];
    }
  }
) as Readonly<AppConfig>;
