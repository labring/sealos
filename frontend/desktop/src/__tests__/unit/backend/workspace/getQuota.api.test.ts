import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyAccessToken, generateBillingToken, fetchQuota } = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
  generateBillingToken: vi.fn(() => 'billing-token'),
  fetchQuota: vi.fn()
}));

vi.mock('@/services/backend/auth', () => ({
  generateBillingToken,
  verifyAccessToken
}));

import handler from '@/pages/api/workspace/getQuota';

const createMockRes = () => {
  const res: any = {
    body: undefined,
    json: vi.fn((payload: unknown) => {
      res.body = payload;
      return res;
    })
  };
  return res;
};

describe('workspace quota api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).AppConfig = {
      desktop: {
        auth: {
          billingUrl: 'https://billing.example.com'
        }
      }
    };
    vi.stubGlobal('fetch', fetchQuota);
    verifyAccessToken.mockResolvedValue({
      userId: 'user-id',
      userUid: 'user-uid',
      workspaceId: 'workspace-id'
    });
  });

  it('maps the ResourceQuota pods entry to a pod quota item', async () => {
    fetchQuota.mockResolvedValue({
      clone: () => ({
        json: async () => ({
          quota: {
            hard: { pods: '20' },
            used: { pods: '3' }
          }
        })
      })
    });

    const res = createMockRes();
    await handler({ headers: {}, method: 'GET' } as any, res);

    expect(res.body).toEqual({
      code: 200,
      data: {
        quota: [{ limit: 20, type: 'pod', used: 3 }]
      },
      message: ''
    });
  });

  it('keeps an empty quota response compatible when pods is absent', async () => {
    fetchQuota.mockResolvedValue({
      clone: () => ({
        json: async () => ({ quota: { hard: {}, used: {} } })
      })
    });

    const res = createMockRes();
    await handler({ headers: {}, method: 'GET' } as any, res);

    expect(res.body).toEqual({ code: 200, data: { quota: [] }, message: '' });
  });
});
