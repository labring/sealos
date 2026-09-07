import { describe, expect, it } from 'vitest';
import { rebindMainServiceRoutes, syncDefaultRouteServicePort } from '@/utils/network-routes';

describe('rebindMainServiceRoutes', () => {
  it('removes a stale main service name while preserving explicit backends', () => {
    expect(
      rebindMainServiceRoutes({
        routes: [
          {
            path: '/',
            pathType: 'Prefix',
            serviceName: 'demo-old-service',
            servicePort: 80
          },
          {
            path: '/healthz',
            pathType: 'Exact',
            serviceName: '',
            servicePort: 80
          },
          {
            path: '/api',
            pathType: 'Prefix',
            serviceName: 'demo-api',
            servicePort: 8080
          }
        ],
        previousServiceName: 'demo-old-service'
      })
    ).toEqual([
      {
        path: '/',
        pathType: 'Prefix',
        serviceName: '',
        servicePort: 80
      },
      {
        path: '/healthz',
        pathType: 'Exact',
        serviceName: '',
        servicePort: 80
      },
      {
        path: '/api',
        pathType: 'Prefix',
        serviceName: 'demo-api',
        servicePort: 8080
      }
    ]);
  });

  it('does not alter routes when the previous main service is unknown', () => {
    const routes = [
      {
        path: '/api',
        pathType: 'Prefix' as const,
        serviceName: 'demo-api',
        servicePort: 8080
      }
    ];

    expect(rebindMainServiceRoutes({ routes, previousServiceName: '' })).toBe(routes);
  });
});

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
