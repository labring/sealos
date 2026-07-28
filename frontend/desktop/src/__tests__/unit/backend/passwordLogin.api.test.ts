const mockGetGlobalToken = jest.fn();
const mockInitRegionToken = jest.fn();

jest.mock('@/services/backend/globalAuth', () => ({
  getGlobalToken: mockGetGlobalToken
}));

jest.mock('@/services/backend/regionAuth', () => ({
  initRegionToken: mockInitRegionToken
}));

jest.mock('@/services/enable', () => ({
  enablePassword: () => true
}));

jest.mock('@/utils/crypto', () => ({
  strongPassword: () => true
}));

const createMockResponse = () => {
  const res = {
    json: jest.fn()
  };
  return res as any;
};

describe('password login API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    mockGetGlobalToken.mockResolvedValue({
      token: 'global-token',
      needInit: true,
      user: {
        userUid: 'user-uid',
        userId: 'user-id'
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses normalized name and returns needInit without synchronous workspace initialization', async () => {
    const { default: handler } = await import('@/pages/api/auth/password');
    const res = createMockResponse();

    await handler(
      {
        body: {
          user: ' admin ',
          password: 'testtest'
        }
      } as any,
      res
    );

    expect(mockGetGlobalToken).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: ' admin ',
        name: 'admin',
        password: 'testtest'
      })
    );
    expect(mockInitRegionToken).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      code: 200,
      message: 'Successfully',
      data: {
        token: 'global-token',
        needInit: true
      }
    });
  });

  it('rejects unsafe usernames before global auth lookup', async () => {
    const { default: handler } = await import('@/pages/api/auth/password');
    const res = createMockResponse();

    await handler(
      {
        body: {
          user: 'ad\u200bmin',
          password: 'testtest'
        }
      } as any,
      res
    );

    expect(mockGetGlobalToken).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      code: 400,
      message: 'Invalid username.',
      data: null
    });
  });

  it('returns a generic unauthorized response for password auth failures', async () => {
    const { default: handler } = await import('@/pages/api/auth/password');
    const { AuthError } = await import('@/services/backend/errors');
    const res = createMockResponse();
    mockGetGlobalToken.mockRejectedValue(new AuthError('User not found.', 'USER_NOT_FOUND'));

    await handler(
      {
        body: {
          user: 'admin',
          password: 'testtest'
        }
      } as any,
      res
    );

    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: 'Unauthorized',
      data: null
    });
  });
});

export {};
