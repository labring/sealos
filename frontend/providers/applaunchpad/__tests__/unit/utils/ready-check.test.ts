import { describe, expect, it } from 'vitest';
import { getReadyCheckTarget } from '@/utils/ready-check';

describe('ready check target helpers', () => {
  it('keeps CNAME mode probing the public host directly', () => {
    const target = getReadyCheckTarget({
      host: 'app.example.com',
      backendProtocol: 'HTTP',
      config: { disableHttps: false, cloudPort: ':443', httpPort: ':80' },
      customDomainMode: 'cname'
    });

    expect(target).toEqual({
      fetchUrl: 'https://app.example.com:443',
      url: 'https://app.example.com:443'
    });
  });

  it('probes the internal gateway with the custom host in certificate mode', () => {
    const target = getReadyCheckTarget({
      host: 'test.com',
      backendProtocol: 'HTTP',
      config: { disableHttps: false, cloudPort: ':443', httpPort: ':80' },
      customDomainMode: 'certificate'
    });

    expect(target).toEqual({
      fetchUrl: 'https://higress-gateway.higress-system.svc.cluster.local',
      url: 'https://test.com:443',
      hostHeader: 'test.com',
      servername: 'test.com'
    });
  });

  it('uses the internal HTTP gateway when HTTPS is disabled', () => {
    const target = getReadyCheckTarget({
      host: 'test.com',
      backendProtocol: 'HTTP',
      config: { disableHttps: true, cloudPort: ':443', httpPort: ':80' },
      customDomainMode: 'certificate',
      gatewayHost: 'gateway.local'
    });

    expect(target).toEqual({
      fetchUrl: 'http://gateway.local',
      url: 'http://test.com:80',
      hostHeader: 'test.com',
      servername: 'test.com'
    });
  });
});
