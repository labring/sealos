const mockFilterAuthenticationToken = jest.fn();
const mockCanUseGlobalAuthToken = jest.fn();
const mockInitRegionToken = jest.fn();
const mockGetRegionToken = jest.fn();

jest.mock('@/services/backend/middleware/access', () => ({
  filterAuthenticationToken: mockFilterAuthenticationToken
}));

jest.mock('@/services/backend/authGuard', () => ({
  canUseGlobalAuthToken: mockCanUseGlobalAuthToken
}));

jest.mock('@/services/backend/regionAuth', () => ({
  initRegionToken: mockInitRegionToken,
  getRegionToken: mockGetRegionToken
}));

jest.mock('@/services/enable', () => ({
  getRegionUid: () => 'region-uid'
}));

jest.mock('@/services/backend/svc/workspaceDefaults', () => ({
  getRequestDefaultPrivateWorkspaceName: jest.fn(() => 'default-workspace')
}));

const createMockResponse = () => {
  const res = {
    json: jest.fn()
  };
  return res as any;
};

describe('global-token region access guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    mockFilterAuthenticationToken.mockImplementation((_req, _res, next) =>
      next({ userId: 'user-id', userUid: 'user-uid' })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('blocks workspace initialization when the global user can no longer use auth tokens', async () => {
    const { default: handler } = await import('@/pages/api/auth/initRegionToken');
    const res = createMockResponse();
    mockCanUseGlobalAuthToken.mockResolvedValue(false);

    await handler({ body: { workspaceName: 'workspace' } } as any, res);

    expect(mockCanUseGlobalAuthToken).toHaveBeenCalledWith({ userUid: 'user-uid' });
    expect(mockInitRegionToken).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: 'Unauthorized',
      data: null
    });
  });

  it('blocks region token minting when the global user can no longer use auth tokens', async () => {
    const { default: handler } = await import('@/pages/api/auth/regionToken');
    const res = createMockResponse();
    mockCanUseGlobalAuthToken.mockResolvedValue(false);

    await handler({ body: {} } as any, res);

    expect(mockCanUseGlobalAuthToken).toHaveBeenCalledWith({ userUid: 'user-uid' });
    expect(mockGetRegionToken).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: 'Unauthorized',
      data: null
    });
  });
});

export {};
