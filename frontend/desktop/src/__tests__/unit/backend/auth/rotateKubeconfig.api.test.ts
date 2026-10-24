import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyAccessToken, K8sApiDefault, isAdminKubeconfigUser } = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
  K8sApiDefault: vi.fn(),
  isAdminKubeconfigUser: vi.fn()
}));

vi.mock('@/services/backend/auth', () => ({ verifyAccessToken }));
vi.mock('@/services/backend/kubernetes/admin', () => ({
  K8sApiDefault,
  isAdminKubeconfigUser
}));

import handler from '@/pages/api/auth/rotateKubeconfig';

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

describe('rotate kubeconfig api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for admin without touching the cluster API', async () => {
    verifyAccessToken.mockResolvedValue({
      userCrName: 'admin',
      workspaceId: 'other-workspace'
    });
    isAdminKubeconfigUser.mockReturnValue(true);

    const res = createMockRes();
    await handler({ headers: {} } as any, res);

    expect(res.body).toEqual({
      code: 403,
      message: 'Kubeconfig rotation is forbidden for admin users',
      data: null
    });
    expect(K8sApiDefault).not.toHaveBeenCalled();
  });
});
