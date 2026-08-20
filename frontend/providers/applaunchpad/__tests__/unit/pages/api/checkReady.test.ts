// @vitest-environment node
import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import handler from '@/pages/api/checkReady';
import { getK8s } from '@/services/backend/kubernetes';

vi.mock('@/services/backend/auth', () => ({
  authSession: vi.fn().mockResolvedValue('kubeconfig')
}));

vi.mock('@/services/backend/kubernetes', () => ({
  getK8s: vi.fn()
}));

vi.mock('@/config', () => ({
  Config: () => ({
    cloud: {
      disableHttps: false,
      domain: 'sealos.run',
      httpPort: undefined,
      port: undefined,
      userDomains: []
    }
  })
}));

const mockedGetK8s = vi.mocked(getK8s);
const mockedFetch = vi.fn();

global.fetch = mockedFetch;

const createResponse = () => {
  const res = {
    json: vi.fn((payload) => payload)
  } as unknown as NextApiResponse & { json: ReturnType<typeof vi.fn> };

  return res;
};

const callHandler = async () => {
  const req = {
    query: {
      appName: 'hello-world'
    },
    headers: {}
  } as unknown as NextApiRequest;
  const res = createResponse();

  await handler(req, res);

  return res.json.mock.calls[0][0];
};

describe('/api/checkReady', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetK8s.mockResolvedValue({
      namespace: 'ns-test',
      k8sNetworkingApp: {
        listNamespacedIngress: vi.fn().mockResolvedValue({
          body: {
            items: [
              {
                metadata: {
                  annotations: {
                    'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP'
                  }
                },
                spec: {
                  rules: [
                    {
                      host: 'hello-world.sealos.run'
                    }
                  ]
                }
              }
            ]
          }
        })
      }
    } as any);
  });

  it('marks a 503 no healthy upstream response as not ready', async () => {
    mockedFetch.mockResolvedValueOnce({
      status: 503,
      headers: {
        get: vi.fn()
      },
      text: vi.fn().mockResolvedValue('no healthy upstream')
    });

    const response = await callHandler();

    expect(response.code).toBe(200);
    expect(response.data).toEqual([
      {
        ready: false,
        url: 'https://hello-world.sealos.run',
        error: 'Upstream not healthy'
      }
    ]);
  });
});
