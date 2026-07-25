import { describe, expect, it } from 'vitest';
import { buildExternalUrl, formatPort, getExternalProtocol } from '@/utils/network-url';

describe('network-url helpers', () => {
  it('formats optional ports with one leading colon', () => {
    expect(formatPort('')).toBe('');
    expect(formatPort('8443')).toBe(':8443');
    expect(formatPort(':8080')).toBe(':8080');
  });

  it('uses secure application protocols by default', () => {
    expect(getExternalProtocol('HTTP')).toBe('https');
    expect(getExternalProtocol('GRPC')).toBe('grpcs');
    expect(getExternalProtocol('WS')).toBe('wss');
  });

  it('uses plain application protocols when https is disabled', () => {
    const config = { disableHttps: true };

    expect(getExternalProtocol('HTTP', config)).toBe('http');
    expect(getExternalProtocol('GRPC', config)).toBe('grpc');
    expect(getExternalProtocol('WS', config)).toBe('ws');
  });

  it('keeps transport protocols independent from https mode', () => {
    const config = { disableHttps: true, httpPort: '80', cloudPort: '443' };

    expect(
      buildExternalUrl({ protocol: 'TCP', host: 'tcp.example.com', nodePort: 30001, config })
    ).toBe('tcp://tcp.example.com:30001');
    expect(
      buildExternalUrl({ protocol: 'UDP', host: 'udp.example.com', nodePort: 30002, config })
    ).toBe('udp://udp.example.com:30002');
  });

  it('builds http-only public application URLs with the http port', () => {
    const config = { disableHttps: true, httpPort: ':80', cloudPort: ':443' };

    expect(buildExternalUrl({ protocol: 'HTTP', host: 'app.example.com', config })).toBe(
      'http://app.example.com:80'
    );
    expect(buildExternalUrl({ protocol: 'GRPC', host: 'grpc.example.com', config })).toBe(
      'grpc://grpc.example.com:80'
    );
    expect(buildExternalUrl({ protocol: 'WS', host: 'ws.example.com', config })).toBe(
      `ws${'://'}ws.example.com:80`
    );
  });
});
