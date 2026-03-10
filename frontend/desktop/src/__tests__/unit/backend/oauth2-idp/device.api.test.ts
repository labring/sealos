import { OAuth2HttpError } from '@/services/backend/oauth2/errors';

jest.mock('@/services/backend/oauth2/service', () => ({
  createDeviceAuthorizationGrant: jest.fn()
}));

import handler from '@/pages/api/auth/oauth2/device';
import { createDeviceAuthorizationGrant } from '@/services/backend/oauth2/service';

const mockCreateDeviceAuthorizationGrant = createDeviceAuthorizationGrant as jest.MockedFunction<
  typeof createDeviceAuthorizationGrant
>;

const createMockRes = () => {
  const res: any = {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader: jest.fn((name: string, value: string) => {
      res.headers[name] = value;
    }),
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload: unknown) => {
      res.body = payload;
      return res;
    }),
    end: jest.fn(() => res)
  };
  return res;
};

describe('oauth2 device api handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-POST method and still sets no-store headers', async () => {
    const req: any = { method: 'GET', body: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalled();
  });

  it('returns invalid_request when body schema validation fails', async () => {
    const req: any = { method: 'POST', body: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('maps OAuth2HttpError from service to OAuth2 error response', async () => {
    mockCreateDeviceAuthorizationGrant.mockRejectedValue(
      new OAuth2HttpError(401, 'invalid_client', 'invalid client')
    );

    const req: any = {
      method: 'POST',
      body: {
        client_id: 'client-1'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'invalid_client',
      error_description: 'invalid client'
    });
  });

  it('returns success payload when service resolves', async () => {
    mockCreateDeviceAuthorizationGrant.mockResolvedValue({
      device_code: 'device',
      user_code: 'ABCD-EFGH',
      verification_uri: 'https://example.com/oauth2/device',
      verification_uri_complete: 'https://example.com/oauth2/device?user_code=ABCD-EFGH',
      expires_in: 600,
      interval: 5
    });

    const req: any = {
      method: 'POST',
      body: {
        client_id: 'client-1'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      device_code: 'device',
      user_code: 'ABCD-EFGH',
      verification_uri: 'https://example.com/oauth2/device',
      verification_uri_complete: 'https://example.com/oauth2/device?user_code=ABCD-EFGH',
      expires_in: 600,
      interval: 5
    });
  });
});
