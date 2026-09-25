import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '@/pages/api/startApp';
import { ResponseCode, ResponseMessages } from '@/types/response';

const createK8sContextMock = vi.hoisted(() => vi.fn());
const startAppMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/backend', () => ({
  createK8sContext: createK8sContextMock,
  startApp: startAppMock
}));

function createResponse() {
  return {
    json: vi.fn((payload) => payload)
  } as any;
}

describe('/api/startApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createK8sContextMock.mockResolvedValue({ namespace: 'ns-demo' });
  });

  it('returns a permission error when Kubernetes rejects the start operation', async () => {
    startAppMock.mockRejectedValue({
      body: {
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        code: 403,
        message: 'deployments.apps "demo" is forbidden'
      }
    });
    const res = createResponse();

    await handler(
      {
        query: { appName: 'demo' }
      } as any,
      res
    );

    expect(createK8sContextMock).toHaveBeenCalled();
    expect(startAppMock).toHaveBeenCalledWith('demo', { namespace: 'ns-demo' });
    expect(res.json).toHaveBeenCalledWith({
      code: ResponseCode.FORBIDDEN,
      message: ResponseMessages[ResponseCode.FORBIDDEN],
      data: undefined,
      error: undefined
    });
  });
});
