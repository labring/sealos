import { describe, expect, it } from 'vitest';
import {
  getIngressServiceBackends,
  getReadyCheckTarget,
  hasReadyEndpointForBackend
} from '@/utils/ready-check';

describe('ready check target helpers', () => {
  it('keeps CNAME mode displaying the public URL while probing the internal gateway', () => {
    const target = getReadyCheckTarget({
      host: 'app.example.com',
      backendProtocol: 'HTTP',
      config: { disableHttps: false, cloudPort: ':443', httpPort: ':80' }
    });

    expect(target).toEqual({
      fetchUrl: 'http://higress-gateway.higress-system.svc.cluster.local',
      url: 'https://app.example.com:443',
      hostHeader: 'app.example.com',
      servername: 'app.example.com'
    });
  });

  it('probes the internal gateway with the custom host in certificate mode', () => {
    const target = getReadyCheckTarget({
      host: 'test.com',
      backendProtocol: 'HTTP',
      config: { disableHttps: false, cloudPort: ':443', httpPort: ':80' }
    });

    expect(target).toEqual({
      fetchUrl: 'http://higress-gateway.higress-system.svc.cluster.local',
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
      gatewayHost: 'gateway.local'
    });

    expect(target).toEqual({
      fetchUrl: 'http://gateway.local',
      url: 'http://test.com:80',
      hostHeader: 'test.com',
      servername: 'test.com'
    });
  });

  it('extracts ingress service backends from all paths', () => {
    expect(
      getIngressServiceBackends({
        spec: {
          rules: [
            {
              http: {
                paths: [
                  {
                    backend: {
                      service: {
                        name: 'app-service',
                        port: {
                          number: 80
                        }
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      })
    ).toEqual([
      {
        serviceName: 'app-service',
        servicePortName: undefined,
        servicePortNumber: 80
      }
    ]);
  });

  it('requires a ready endpoint address for the ingress backend port', () => {
    expect(
      hasReadyEndpointForBackend(
        [
          {
            addresses: [{ ip: '10.0.0.1' }],
            ports: [{ name: 'http', port: 80 }]
          }
        ],
        { serviceName: 'app-service', servicePortNumber: 80 }
      )
    ).toBe(true);

    expect(
      hasReadyEndpointForBackend(
        [
          {
            addresses: [],
            ports: [{ name: 'http', port: 80 }]
          }
        ],
        { serviceName: 'app-service', servicePortNumber: 80 }
      )
    ).toBe(false);

    expect(
      hasReadyEndpointForBackend(
        [
          {
            addresses: [{ ip: '10.0.0.1' }],
            ports: [{ name: 'grpc', port: 50051 }]
          }
        ],
        { serviceName: 'app-service', servicePortNumber: 80 }
      )
    ).toBe(false);
  });
});
