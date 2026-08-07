import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '@/pages/api/v1/app/[name]/network-isolation';

const createK8sContextMock = vi.hoisted(() => vi.fn());
const getNetworkIsolationMock = vi.hoisted(() => vi.fn());
const saveNetworkIsolationMock = vi.hoisted(() => vi.fn());
const isNetworkIsolationAvailableMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/backend', () => ({
  createK8sContext: createK8sContextMock
}));

vi.mock('@/services/backend/networkIsolation', () => {
  class NetworkIsolationError extends Error {
    status: number;
    code: string;
    details?: Record<string, unknown>;

    constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
      super(message);
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }

  return {
    NetworkIsolationError,
    getNetworkIsolation: getNetworkIsolationMock,
    saveNetworkIsolation: saveNetworkIsolationMock
  };
});

vi.mock('@/services/backend/networkIsolationCapability', () => ({
  isNetworkIsolationAvailable: isNetworkIsolationAvailableMock
}));

const createRequest = (options: {
  method?: string;
  name?: string | string[];
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}) =>
  ({
    method: options.method ?? 'GET',
    query: { name: options.name ?? 'web' },
    headers: options.headers ?? {},
    body: options.body
  } as any);

const createResponse = () =>
  ({
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn((payload) => payload)
  } as any);

const response = {
  config: { enabled: false, rules: [] },
  revision: '2',
  target: {
    workspaceId: 'ns-demo',
    applicationId: 'web',
    hasDomainIngress: false,
    hasExternalPort: false
  },
  enforcement: {
    phase: 'Disabled',
    current: true,
    overall: 'disabled',
    scopes: { internal: 'disabled', domain: 'notConfigured', externalPort: 'notConfigured' },
    issues: []
  }
};

describe('/api/v1/app/[name]/network-isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createK8sContextMock.mockResolvedValue({ namespace: 'ns-demo' });
    getNetworkIsolationMock.mockResolvedValue(response);
    saveNetworkIsolationMock.mockResolvedValue(response);
    isNetworkIsolationAvailableMock.mockResolvedValue(true);
  });

  it('returns the server DTO for GET', async () => {
    const res = createResponse();

    await handler(createRequest({}), res);

    expect(getNetworkIsolationMock).toHaveBeenCalledWith('web', { namespace: 'ns-demo' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200, data: response }));
  });

  it('saves the full DTO with the If-Match revision for PUT', async () => {
    const res = createResponse();
    const config = {
      enabled: true,
      rules: [{ id: 'cidr', type: 'cidr', cidrs: ['10.0.0.1'] }]
    };

    await handler(
      createRequest({ method: 'PUT', headers: { 'if-match': '"2"' }, body: { config } }),
      res
    );

    expect(saveNetworkIsolationMock).toHaveBeenCalledWith('web', config, '2', {
      namespace: 'ns-demo'
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200, data: response }));
  });

  it('reports a structured revision conflict without silently overwriting', async () => {
    const { NetworkIsolationError } = await import('@/services/backend/networkIsolation');
    saveNetworkIsolationMock.mockRejectedValue(
      new NetworkIsolationError(409, 'REVISION_CONFLICT', 'Refresh and try again.')
    );
    const res = createResponse();

    await handler(
      createRequest({
        method: 'PUT',
        headers: { 'if-match': '2' },
        body: { config: response.config }
      }),
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 409,
        error: { code: 'REVISION_CONFLICT', details: undefined }
      })
    );
  });

  it('rejects unsupported methods before creating a Kubernetes context', async () => {
    const res = createResponse();

    await handler(createRequest({ method: 'POST' }), res);

    expect(createK8sContextMock).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET, PUT');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 405 }));
  });

  it('returns 404 without creating a Kubernetes context when the feature is unavailable', async () => {
    isNetworkIsolationAvailableMock.mockResolvedValue(false);
    const res = createResponse();

    await handler(createRequest({}), res);

    expect(createK8sContextMock).not.toHaveBeenCalled();
    expect(getNetworkIsolationMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 404,
        error: { code: 'NETWORK_ISOLATION_UNAVAILABLE' }
      })
    );
  });
});
