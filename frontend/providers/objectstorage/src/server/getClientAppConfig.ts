import { Config } from '@/config';
import { ClientAppConfig, ClientAppConfigSchema } from '@/types/config';
import { validateClientAppConfigOrThrow } from '@sealos/shared/server/config';

export function getClientAppConfigServer(): ClientAppConfig {
  const fullConfig = Config();
  return validateClientAppConfigOrThrow(ClientAppConfigSchema, {
    cloud: fullConfig.cloud,
    objectStorage: {
      resources: fullConfig.objectStorage.resources,
      components: {
        monitoring: fullConfig.objectStorage.components.monitoring,
        appLaunchpad: fullConfig.objectStorage.components.appLaunchpad
      },
      hosting: fullConfig.objectStorage.hosting
    }
  });
}
