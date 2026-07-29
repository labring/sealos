const mockOauthProviderFindUnique = jest.fn();
const mockRestrictedUserFindFirst = jest.fn();
const mockAccountFindUnique = jest.fn();
const mockUserTaskFindFirst = jest.fn();
const mockUserInfoFindUnique = jest.fn();
const mockGlobalTransaction = jest.fn();
const mockUserUpdate = jest.fn();
const mockGenerateAuthenticationToken = jest.fn(() => 'global-token');

jest.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    oauthProvider: {
      findUnique: mockOauthProviderFindUnique,
      findFirst: jest.fn()
    },
    restrictedUser: {
      findFirst: mockRestrictedUserFindFirst
    },
    account: {
      findUnique: mockAccountFindUnique
    },
    userTask: {
      findFirst: mockUserTaskFindFirst
    },
    userInfo: {
      findUnique: mockUserInfoFindUnique
    },
    user: {
      update: mockUserUpdate
    },
    $transaction: mockGlobalTransaction
  }
}));

jest.mock('@/services/enable', () => ({
  enableSignUp: () => true,
  enableTracking: () => false,
  getRegionUid: () => 'region-uid',
  getVersion: () => 'cn'
}));

jest.mock('@/services/backend/auth', () => ({
  generateAuthenticationToken: mockGenerateAuthenticationToken
}));

jest.mock('@/utils/crypto', () => ({
  hashPassword: (password: string) => `hash:${password}`
}));

jest.mock('@/api/platform', () => ({
  uploadConvertData: jest.fn()
}));

jest.mock('@/services/backend/tracking', () => ({
  trackSignUp: jest.fn()
}));

jest.mock('@/services/backend/svc/bindProvider', () => ({
  addOauthProvider: jest.fn(),
  bindEmailSvc: jest.fn()
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'generated-user-id')
}));

describe('global password auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    mockOauthProviderFindUnique.mockReset();
    mockRestrictedUserFindFirst.mockResolvedValue(null);
    mockAccountFindUnique.mockResolvedValue(null);
    mockUserTaskFindFirst.mockResolvedValue(null);
    mockUserInfoFindUnique.mockResolvedValue({ isInited: true });
    mockUserUpdate.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not auto-register admin-like provider misses', async () => {
    const { getGlobalToken } = await import('@/services/backend/globalAuth');
    const { ProviderType } = await import('prisma/global/generated/client');

    mockOauthProviderFindUnique.mockResolvedValue(null);

    await expect(
      getGlobalToken({
        provider: ProviderType.PASSWORD,
        providerId: 'Admin',
        name: 'Admin',
        avatar_url: '',
        password: 'testtest'
      })
    ).rejects.toMatchObject({
      errorCode: 'USER_NOT_FOUND'
    });
    expect(mockGlobalTransaction).not.toHaveBeenCalled();
  });

  it('uses trimmed username for existing password users', async () => {
    const { signInByPassword } = await import('@/services/backend/globalAuth');
    const { ProviderType } = await import('prisma/global/generated/client');

    mockOauthProviderFindUnique.mockResolvedValue({
      userUid: 'user-uid',
      user: {
        uid: 'user-uid',
        name: 'admin',
        nickname: 'admin',
        avatarUri: '',
        status: 'NORMAL_USER'
      }
    });

    await expect(signInByPassword({ id: ' admin ', password: 'testtest' })).resolves.toMatchObject({
      user: {
        uid: 'user-uid',
        name: 'admin'
      }
    });
    expect(mockOauthProviderFindUnique).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          providerId_providerType: {
            providerType: ProviderType.PASSWORD,
            providerId: 'admin'
          },
          password: 'hash:testtest'
        }
      })
    );
  });

  it('falls back to a legacy raw provider id without creating another password user', async () => {
    const { signInByPassword } = await import('@/services/backend/globalAuth');
    const { ProviderType } = await import('prisma/global/generated/client');

    mockOauthProviderFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      userUid: 'user-uid',
      user: {
        uid: 'user-uid',
        name: 'alice',
        nickname: 'alice',
        avatarUri: '',
        status: 'NORMAL_USER'
      }
    });

    await expect(signInByPassword({ id: ' alice ', password: 'testtest' })).resolves.toMatchObject({
      user: {
        uid: 'user-uid',
        name: 'alice'
      }
    });
    expect(mockOauthProviderFindUnique).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          providerId_providerType: {
            providerType: ProviderType.PASSWORD,
            providerId: ' alice '
          },
          password: 'hash:testtest'
        }
      })
    );
  });

  it('does not auto-register changed password usernames when no provider matches', async () => {
    const { getGlobalToken } = await import('@/services/backend/globalAuth');
    const { ProviderType } = await import('prisma/global/generated/client');

    mockOauthProviderFindUnique.mockResolvedValue(null);

    await expect(
      getGlobalToken({
        provider: ProviderType.PASSWORD,
        providerId: ' alice ',
        name: ' alice ',
        avatar_url: '',
        password: 'testtest'
      })
    ).rejects.toMatchObject({
      errorCode: 'USER_NOT_FOUND'
    });
    expect(mockGlobalTransaction).not.toHaveBeenCalled();
  });

  it('does not retry unknown commit-state password signup timeouts', async () => {
    const { signUpByPassword } = await import('@/services/backend/globalAuth');

    mockGlobalTransaction.mockRejectedValue({
      code: 'P1008',
      message: 'database timeout'
    });

    await expect(
      signUpByPassword({
        id: 'alice',
        name: 'alice',
        avatar_url: '',
        password: 'testtest'
      })
    ).resolves.toBeNull();
    expect(mockGlobalTransaction).toHaveBeenCalledTimes(1);
  });

  it('skips no-op profile updates for existing password users', async () => {
    const { getGlobalToken } = await import('@/services/backend/globalAuth');
    const { ProviderType } = await import('prisma/global/generated/client');
    const user = {
      uid: 'user-uid',
      name: 'admin',
      nickname: 'admin',
      avatarUri: '',
      status: 'NORMAL_USER'
    };

    mockOauthProviderFindUnique
      .mockResolvedValueOnce({ userUid: 'user-uid', providerId: 'admin' })
      .mockResolvedValueOnce({
        userUid: 'user-uid',
        providerId: 'admin',
        user
      });

    await expect(
      getGlobalToken({
        provider: ProviderType.PASSWORD,
        providerId: ' admin ',
        name: ' admin ',
        avatar_url: '',
        password: 'testtest'
      })
    ).resolves.toMatchObject({
      token: 'global-token',
      needInit: false,
      user: {
        userUid: 'user-uid',
        userId: 'admin'
      }
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
