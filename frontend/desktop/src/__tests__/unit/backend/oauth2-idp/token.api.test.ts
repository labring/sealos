import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { OAuth2HttpError } from '@/services/backend/oauth2/errors';

vi.mock('@/services/backend/oauth2/service', () => ({
  exchangeDeviceCodeForToken: vi.fn(),
  exchangeRefreshTokenForToken: vi.fn()
}));

import handler from '@/pages/api/auth/oauth2/token';
import {
  exchangeDeviceCodeForToken,
  exchangeRefreshTokenForToken
} from '@/services/backend/oauth2/service';

const mockExchangeDeviceCodeForToken = exchangeDeviceCodeForToken as MockedFunction<
  typeof exchangeDeviceCodeForToken
>;
const mockExchangeRefreshTokenForToken = exchangeRefreshTokenForToken as MockedFunction<
  typeof exchangeRefreshTokenForToken
>;

const createMockRes = () => {
  const res: any = {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader: vi.fn((name: string, value: string) => {
      res.headers[name] = value;
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload: unknown) => {
      res.body = payload;
      return res;
    }),
    end: vi.fn(() => res)
  };
  return res;
};

describe('oauth2 token api handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('maps OAuth2HttpError from refresh exchange to OAuth2 error response', async () => {
    mockExchangeRefreshTokenForToken.mockRejectedValue(
      new OAuth2HttpError(401, 'invalid_client', 'bad client')
    );

    const req: any = {
      method: 'POST',
      body: {
        grant_type: 'refresh_token',
        refresh_token: 'token',
        client_id: 'client-1'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'invalid_client',
      error_description: 'bad client'
    });
  });

  it('returns success payload for device code grant', async () => {
    mockExchangeDeviceCodeForToken.mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
      token_type: 'Bearer',
      expires_in: 3600
    });

    const req: any = {
      method: 'POST',
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'device-code',
        client_id: 'client-1'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      access_token: 'a',
      refresh_token: 'r',
      token_type: 'Bearer',
      expires_in: 3600
    });
  });
});
