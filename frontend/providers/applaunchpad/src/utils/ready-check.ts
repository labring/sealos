import type { ApplicationProtocolType } from '@/types/app';
import { buildExternalUrl, ExternalAccessConfig } from './network-url';

export const DEFAULT_READY_CHECK_GATEWAY_HOST = 'higress-gateway.higress-system.svc.cluster.local';

export type ReadyCheckTarget = {
  fetchUrl: string;
  url: string;
  hostHeader?: string;
  servername?: string;
};

export type ReadyCheckBackend = {
  serviceName: string;
  servicePortName?: string;
  servicePortNumber?: number;
};

type IngressLike = {
  spec?: {
    defaultBackend?: {
      service?: {
        name?: string;
        port?: {
          name?: string;
          number?: number;
        };
      };
    };
    rules?: Array<{
      http?: {
        paths?: Array<{
          backend?: {
            service?: {
              name?: string;
              port?: {
                name?: string;
                number?: number;
              };
            };
          };
        }>;
      };
    }>;
  };
};

type EndpointSubsetLike = {
  addresses?: unknown[];
  ports?: Array<{
    name?: string;
    port?: number;
  }>;
};

const getInternalGatewayAccessConfig = (config: ExternalAccessConfig): ExternalAccessConfig => ({
  ...config,
  disableHttps: true,
  cloudPort: '',
  httpPort: ''
});

const getServiceBackend = (service?: {
  name?: string;
  port?: {
    name?: string;
    number?: number;
  };
}): ReadyCheckBackend | null => {
  if (!service?.name) return null;

  return {
    serviceName: service.name,
    servicePortName: service.port?.name,
    servicePortNumber: service.port?.number
  };
};

export const getIngressServiceBackends = (ingress: IngressLike): ReadyCheckBackend[] => {
  const backendMap = new Map<string, ReadyCheckBackend>();
  const addBackend = (backend: ReadyCheckBackend | null) => {
    if (!backend) return;
    const port = backend.servicePortName || backend.servicePortNumber || '';
    backendMap.set(`${backend.serviceName}:${port}`, backend);
  };

  addBackend(getServiceBackend(ingress.spec?.defaultBackend?.service));

  ingress.spec?.rules?.forEach((rule) => {
    rule.http?.paths?.forEach((path) => {
      addBackend(getServiceBackend(path.backend?.service));
    });
  });

  return Array.from(backendMap.values());
};

export const hasReadyEndpointForBackend = (
  subsets: EndpointSubsetLike[] | undefined,
  backend: ReadyCheckBackend
) => {
  return !!subsets?.some((subset) => {
    if (!subset.addresses?.length) return false;
    const ports = subset.ports || [];
    if (!backend.servicePortName && !backend.servicePortNumber) return true;
    if (!ports.length) return true;

    return ports.some((port) => {
      if (backend.servicePortName) {
        return port.name === backend.servicePortName;
      }

      return port.port === backend.servicePortNumber;
    });
  });
};

export const getReadyCheckTarget = ({
  host,
  backendProtocol,
  config,
  gatewayHost = DEFAULT_READY_CHECK_GATEWAY_HOST
}: {
  host: string;
  backendProtocol?: ApplicationProtocolType;
  config: ExternalAccessConfig;
  gatewayHost?: string;
}): ReadyCheckTarget => {
  const url = buildExternalUrl({
    protocol: backendProtocol,
    host,
    config
  });

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
};
