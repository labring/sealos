import { Config } from '@/config';
import { ClientAppConfig, ClientAppConfigSchema } from '@/types/config';
import { validateClientAppConfigOrThrow } from '@sealos/shared/server/config';

export function getClientAppConfigServer(): ClientAppConfig {
  const fullConfig = Config();
  return validateClientAppConfigOrThrow(ClientAppConfigSchema, {
    cloud: {
      domain: fullConfig.cloud.domain
    },
    devbox: {
      ui: {
        docUrls: fullConfig.devbox.ui.docUrls,
        currencySymbol: fullConfig.devbox.ui.currencySymbol,
        customScripts: fullConfig.devbox.ui.customScripts
      },
      features: fullConfig.devbox.features,
      runtime: {
        rootNamespace: fullConfig.devbox.runtime.rootNamespace,
        defaultNamespace: fullConfig.devbox.runtime.defaultNamespace,
        sshDomain: fullConfig.devbox.runtime.sshDomain,
        registryHost: fullConfig.devbox.runtime.registryHost,
        webidePort: fullConfig.devbox.runtime.webidePort
      },
      resources: fullConfig.devbox.resources,
      userDomain: fullConfig.devbox.userDomain
    }
  });
}
