import { Config } from '@/src/config';
import { ClientAppConfig, ClientAppConfigSchema } from '@/src/types/config';

export function getClientAppConfigServer(): ClientAppConfig {
  const fullConfig = Config();
  return ClientAppConfigSchema.parse({
    cloud: {
      domain: fullConfig.cloud.domain
    },
    devbox: {
      ui: {
        docUrls: fullConfig.devbox.ui.docUrls,
        currencySymbolType: fullConfig.devbox.ui.currencySymbolType,
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
