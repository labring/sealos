import { OAuth2HttpError } from '@/services/backend/oauth2/errors';

jest.mock('@/services/backend/oauth2/auth', () => ({
  resolveOAuth2AuthUser: jest.fn()
}));

jest.mock('@/services/backend/oauth2/service', () => ({
  getAuthorizeContext: jest.fn(),
  submitAuthorizeDecision: jest.fn()
}));

import contextHandler from '@/pages/api/auth/oauth2/authorize/context';
import decisionHandler from '@/pages/api/auth/oauth2/authorize/decision';
import { resolveOAuth2AuthUser } from '@/services/backend/oauth2/auth';
import { getAuthorizeContext, submitAuthorizeDecision } from '@/services/backend/oauth2/service';

const mockResolveOAuth2AuthUser = resolveOAuth2AuthUser as jest.MockedFunction<
  typeof resolveOAuth2AuthUser
>;
const mockGetAuthorizeContext = getAuthorizeContext as jest.MockedFunction<
  typeof getAuthorizeContext
>;
const mockSubmitAuthorizeDecision = submitAuthorizeDecision as jest.MockedFunction<
  typeof submitAuthorizeDecision
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

describe('oauth2 authorize context api handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-GET method and still sets no-store headers', async () => {
    const req: any = { method: 'POST', query: {} };
    const res = createMockRes();

    await contextHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalled();
  });

  it('returns invalid_request when query schema validation fails', async () => {
    const req: any = { method: 'GET', query: {} };
    const res = createMockRes();

    await contextHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('maps OAuth2HttpError from getAuthorizeContext', async () => {
    mockResolveOAuth2AuthUser.mockResolvedValue(null);
    mockGetAuthorizeContext.mockRejectedValue(
      new OAuth2HttpError(400, 'invalid_grant', 'not found')
    );

    const req: any = {
      method: 'GET',
      query: {
        user_code: 'ABCD-EFGH'
      }
    };
    const res = createMockRes();

    await contextHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'invalid_grant',
      error_description: 'not found'
    });
  });
});

describe('oauth2 authorize decision api handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-POST method and still sets no-store headers', async () => {
    const req: any = { method: 'GET', body: {} };
    const res = createMockRes();

    await decisionHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalled();
  });

  it('returns 401 invalid_request when user is unauthenticated', async () => {
    mockResolveOAuth2AuthUser.mockResolvedValue(null);
    const req: any = {
      method: 'POST',
      body: {
        request_id: '550e8400-e29b-41d4-a716-446655440000',
        decision: 'approve'
      }
    };
    const res = createMockRes();

    await decisionHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'invalid_request',
      error_description: 'Authentication required'
    });
  });

  it('returns invalid_request when request body schema validation fails', async () => {
    mockResolveOAuth2AuthUser.mockResolvedValue({ userUid: 'user-uid' } as any);
    const req: any = { method: 'POST', body: {} };
    const res = createMockRes();

    await decisionHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('maps OAuth2HttpError from submitAuthorizeDecision', async () => {
    mockResolveOAuth2AuthUser.mockResolvedValue({ userUid: 'user-uid' } as any);
    mockSubmitAuthorizeDecision.mockRejectedValue(
      new OAuth2HttpError(400, 'invalid_grant', 'bad request')
    );

    const req: any = {
      method: 'POST',
      body: {
        request_id: '550e8400-e29b-41d4-a716-446655440000',
        decision: 'approve'
      }
    };
    const res = createMockRes();

    await decisionHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'invalid_grant',
      error_description: 'bad request'
    });
  });
});
