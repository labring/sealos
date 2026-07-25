import type { ApplicationProtocolType, TransportProtocolType } from '@/types/app';

type PublicProtocol = ApplicationProtocolType | TransportProtocolType | string | undefined;

export type ExternalAccessConfig = {
  disableHttps?: boolean;
  cloudPort?: string | number;
  httpPort?: string | number;
};

export const normalizePort = (port?: string | number): string => {
  if (port === undefined || port === null) return '';
  const value = `${port}`.trim();
  if (!value) return '';
  return value.startsWith(':') ? value.slice(1) : value;
};

export const formatPort = (port?: string | number): string => {
  const value = normalizePort(port);
  return value ? `:${value}` : '';
};

export const getExternalProtocol = (
  protocol: PublicProtocol,
  config: Pick<ExternalAccessConfig, 'disableHttps'> = {}
): string => {
  const protocolLower = (protocol || 'HTTP').toLowerCase();

  if (protocolLower === 'grpc') return config.disableHttps ? 'grpc' : 'grpcs';
  if (protocolLower === 'ws') return config.disableHttps ? 'ws' : 'wss';
  if (protocolLower === 'http') return config.disableHttps ? 'http' : 'https';
  if (protocolLower === 'sctp') return 'sctp';

  return protocolLower;
};

export const getExternalDomainPort = (config: ExternalAccessConfig = {}): string => {
  return normalizePort(config.disableHttps ? config.httpPort : config.cloudPort);
};

export const buildExternalUrl = ({
  protocol,
  host,
  nodePort,
  config
}: {
  protocol?: PublicProtocol;
  host: string;
  nodePort?: string | number;
  config?: ExternalAccessConfig;
}): string => {
  const scheme = getExternalProtocol(protocol, config);
  const port = nodePort !== undefined ? normalizePort(nodePort) : getExternalDomainPort(config);

  return `${scheme}://${host}${formatPort(port)}`;
};
