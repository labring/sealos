import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyAccessToken, checkKubeconfig, checkUserStatusSvc } = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
  checkKubeconfig: vi.fn(),
  checkUserStatusSvc: vi.fn(
    () => async (_req: unknown, res: any) =>
      res.json({ code: 200, message: 'Successfully', data: null })
  )
}));
vi.mock('@/services/backend/auth', () => ({ verifyAccessToken }));
vi.mock('@/services/backend/kubernetes/checkKubeconfig', () => ({ checkKubeconfig }));
vi.mock('@/services/backend/svc/access', () => ({ checkUserStatusSvc }));

import handler from '@/pages/api/auth/checkStatus';

const response = () => ({ json: vi.fn() });
const request = (body: unknown = { kubeconfig: 'browser-old-kc' }) =>
  ({ method: 'POST', headers: { authorization: 'regional-token' }, body } as any);

describe('desktop session check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAccessToken.mockResolvedValue({ userUid: 'uid', userCrName: 'alice' });
    checkKubeconfig.mockResolvedValue({ code: 200, message: 'Successfully' });
  });

  it('expires an otherwise valid desktop JWT when the browser kubeconfig is rejected', async () => {
    checkKubeconfig.mockResolvedValue({ code: 401, message: 'Kubeconfig is no longer valid' });
    const res = response();
    await handler(request(), res as any);
    expect(checkKubeconfig).toHaveBeenCalledWith('browser-old-kc', 'alice');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }));
    expect(checkUserStatusSvc).not.toHaveBeenCalled();
  });

  it('retains account status checking after successful kubeconfig authentication', async () => {
    const res = response();
    await handler(request(), res as any);
    expect(checkKubeconfig).toHaveBeenCalledWith('browser-old-kc', 'alice');
    expect(checkUserStatusSvc).toHaveBeenCalledWith({ userUid: 'uid' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200 }));
  });

  it('does not turn an unavailable API server into an expired session', async () => {
    checkKubeconfig.mockResolvedValue({ code: 503, message: 'Please try again' });
    const res = response();
    await handler(request(), res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 503 }));
  });

  it('requires a desktop JWT before examining supplied credentials', async () => {
    verifyAccessToken.mockResolvedValue(null);
    const res = response();
    await handler(request(), res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }));
    expect(checkKubeconfig).not.toHaveBeenCalled();
  });

  it('rejects a session with missing kubeconfig', async () => {
    const res = response();
    await handler(request({}), res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }));
    expect(checkKubeconfig).not.toHaveBeenCalled();
  });

  it('does not accept credentials in a GET request', async () => {
    const res = response();
    await handler({ ...request(), method: 'GET' }, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 405 }));
    expect(checkKubeconfig).not.toHaveBeenCalled();
  });
});
