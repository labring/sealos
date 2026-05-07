import { AppConfig } from './types/config';

/**
 * Get the global application configuration.
 * Must only be called on the server side.
 */
export function Config(): Readonly<AppConfig> {
  if (typeof window !== 'undefined') {
    throw new Error('[App Config] App config should only exist on the server side.');
  }

  const cfg = globalThis.__APP_CONFIG__;
  if (!cfg) {
    console.error('[App Config] config not initialized, this should not happen in normal flow.');
    process.exit(1);
  }

  return cfg;
}
