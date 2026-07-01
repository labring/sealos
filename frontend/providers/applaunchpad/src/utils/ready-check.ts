import type { ApplicationProtocolType } from '@/types/app';
import type { CustomDomainMode } from '@/types';
import { buildExternalUrl, ExternalAccessConfig } from './network-url';

export const DEFAULT_READY_CHECK_GATEWAY_HOST = 'higress-gateway.higress-system.svc.cluster.local';

export type ReadyCheckTarget = {
  fetchUrl: string;
  url: string;
  hostHeader?: string;
  servername?: string;
};

const getInternalGatewayAccessConfig = (config: ExternalAccessConfig): ExternalAccessConfig => ({
  ...config,
  cloudPort: '',
  httpPort: ''
});

export const getReadyCheckTarget = ({
  host,
  backendProtocol,
  config,
  customDomainMode,
  gatewayHost = DEFAULT_READY_CHECK_GATEWAY_HOST
}: {
  host: string;
  backendProtocol?: ApplicationProtocolType;
  config: ExternalAccessConfig;
  customDomainMode: CustomDomainMode;
  gatewayHost?: string;
}): ReadyCheckTarget => {
  const url = buildExternalUrl({
    protocol: backendProtocol,
    host,
    config
  });

  if (customDomainMode === 'certificate') {
    return {
      fetchUrl: buildExternalUrl({
        protocol: 'HTTP',
        host: gatewayHost,
        config: getInternalGatewayAccessConfig(config)
      }),
      url,
      hostHeader: host,
      servername: host
    };
  }

  return {
    fetchUrl: buildExternalUrl({
      protocol: 'HTTP',
      host,
      config
    }),
    url
  };
};
