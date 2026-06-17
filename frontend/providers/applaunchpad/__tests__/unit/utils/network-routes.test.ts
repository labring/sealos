import { describe, expect, it } from 'vitest';
import { syncDefaultRouteServicePort } from '@/utils/network-routes';

describe('syncDefaultRouteServicePort', () => {
  it('updates the default main service route when the network port changes', () => {
    const routes = [
      {
        path: '/',
        pathType: 'Prefix' as const,
        serviceName: '',
        servicePort: 80
      },
      {
        path: '/test',
        pathType: 'Prefix' as const,
        serviceName: '',
        servicePort: 80
      }
    ];

    expect(
      syncDefaultRouteServicePort({
        routes,
        previousPort: 80,
        nextPort: 8080
      })
    ).toEqual([
      {
        path: '/',
        pathType: 'Prefix',
        serviceName: '',
        servicePort: 8080
      },
      {
        path: '/test',
        pathType: 'Prefix',
        serviceName: '',
        servicePort: 8080
      }
    ]);
  });

  it('leaves explicit backend routes unchanged', () => {
    const routes = [
      {
        path: '/api',
        pathType: 'Prefix' as const,
        serviceName: 'demo-api',
        servicePort: 80
      }
    ];

    expect(
      syncDefaultRouteServicePort({
        routes,
        previousPort: 80,
        nextPort: 8080,
        networkServiceName: 'demo'
      })
    ).toBe(routes);
  });
});
