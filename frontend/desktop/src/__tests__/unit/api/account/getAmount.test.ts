import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/account/getAmount';
import { generateBillingToken, verifyAccessToken } from '@/services/backend/auth';

jest.mock('@/services/backend/auth', () => ({
  generateBillingToken: jest.fn(),
  verifyAccessToken: jest.fn()
}));

const mockedVerifyAccessToken = jest.mocked(verifyAccessToken);
const mockedGenerateBillingToken = jest.mocked(generateBillingToken);

const createResponse = () => {
  const res = {
    json: jest.fn()
  } as unknown as NextApiResponse;
  return res;
};

const createRequest = () =>
  ({
    headers: {
      authorization: 'encoded-access-token'
    }
  }) as unknown as NextApiRequest;

describe('GET /api/account/getAmount', () => {
  const originalFetch = global.fetch;
  const originalAppConfig = global.AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    global.AppConfig = {
      desktop: {
        auth: {
          billingUrl: 'http://account-service.account-system.svc:2333'
        }
      }
    } as any;
    global.fetch = jest.fn();
    mockedVerifyAccessToken.mockResolvedValue({
      regionUid: 'region-uid',
      userUid: 'real-user-uid',
      userId: 'manager70',
      userCrUid: 'user-cr-uid',
      userCrName: 'user-cr-name',
      workspaceUid: 'workspace-uid',
      workspaceId: 'ns-manager70'
    });
    mockedGenerateBillingToken.mockReturnValue('billing-token');
  });

  afterAll(() => {
    global.fetch = originalFetch;
    global.AppConfig = originalAppConfig;
  });

  it('returns the balance from account-service', async () => {
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        account: {
          Balance: 1000,
          DeductionBalance: 25
        }
      })
    } as Response);

    const res = createResponse();
    await handler(createRequest(), res);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith({ authorization: 'encoded-access-token' });
    expect(mockedGenerateBillingToken).toHaveBeenCalledWith({
      userUid: 'real-user-uid',
      userId: 'manager70'
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://account-service.account-system.svc:2333/account/v1alpha1/account',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer billing-token',
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip,deflate,compress'
        },
        body: '{}'
      }
    );
    expect(res.json).toHaveBeenCalledWith({
      code: 200,
      message: '',
      data: {
        balance: 1000,
        deductionBalance: 25
      }
    });
  });

  it('rejects unauthenticated requests', async () => {
    mockedVerifyAccessToken.mockResolvedValue(null);

    const res = createResponse();
    await handler(createRequest(), res);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: 'token is invaild',
      data: null
    });
  });

  it('fails when billing service is not configured', async () => {
    global.AppConfig = {
      desktop: {
        auth: {}
      }
    } as any;

    const res = createResponse();
    await handler(createRequest(), res);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      code: 500,
      message: 'Billing service not configured',
      data: null
    });
  });

  it('forwards account-service failures as API errors', async () => {
    jest.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401
    } as Response);

    const res = createResponse();
    await handler(createRequest(), res);

    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: 'failed to get account balance',
      data: null
    });
  });
});
