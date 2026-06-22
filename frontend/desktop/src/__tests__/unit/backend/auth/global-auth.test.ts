import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderType, UserStatus } from 'prisma/global/generated/client';

vi.mock('@/api/platform', () => ({
  uploadConvertData: vi.fn()
}));

vi.mock('@/services/backend/auth', () => ({
  generateGlobalAccessToken: vi.fn(() => 'global-token')
}));

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    oauthProvider: {
      findUnique: vi.fn(),
      findFirst: vi.fn()
    },
    restrictedUser: {
      findFirst: vi.fn()
    },
    account: {
      findUnique: vi.fn()
    },
    userTask: {
      findFirst: vi.fn()
    },
    user: {
      update: vi.fn()
    },
    userInfo: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock('@/services/enable', () => ({
  enableSignUp: vi.fn(() => true),
  enableTracking: vi.fn(() => false),
  getRegionUid: vi.fn(() => 'region-uid'),
  getVersion: vi.fn(() => 'cn')
}));

vi.mock('@/services/backend/tracking', () => ({
  trackSignUp: vi.fn()
}));

vi.mock('@/services/backend/svc/bindProvider', () => ({
  addOauthProvider: vi.fn()
}));

import { generateGlobalAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { getGlobalToken } from '@/services/backend/globalAuth';

const mockPrisma = globalPrisma as any;
const mockGenerateGlobalAccessToken = vi.mocked(generateGlobalAccessToken);

describe('getGlobalToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.restrictedUser.findFirst.mockResolvedValue(null);
    mockPrisma.account.findUnique.mockResolvedValue(null);
    mockPrisma.oauthProvider.findFirst.mockResolvedValue(null);
    mockPrisma.userInfo.findUnique.mockResolvedValue({ isInited: true });
  });

  it('does not overwrite an existing user nickname with provider profile name on sign in', async () => {
    const existingUser = {
      uid: 'user-uid',
      id: 'user-id',
      nickname: 'Admin Nickname',
      avatarUri: 'old-avatar',
      status: UserStatus.NORMAL_USER
    };

    mockPrisma.oauthProvider.findUnique
      .mockResolvedValueOnce({
        providerId: 'github-id',
        providerType: ProviderType.GITHUB,
        userUid: existingUser.uid
      })
      .mockResolvedValueOnce({
        providerId: 'github-id',
        providerType: ProviderType.GITHUB,
        userUid: existingUser.uid,
        user: existingUser
      });
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      avatarUri: 'new-avatar'
    });

    const result = await getGlobalToken({
      provider: ProviderType.GITHUB,
      providerId: 'github-id',
      name: 'github-login',
      avatar_url: 'new-avatar'
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { uid: existingUser.uid },
      data: {
        avatarUri: 'new-avatar'
      }
    });
    expect(mockGenerateGlobalAccessToken).toHaveBeenCalledWith({
      sub: existingUser.uid,
      user_id: existingUser.id,
      preferred_username: existingUser.nickname
    });
    expect(result?.user).toEqual({
      name: existingUser.nickname,
      avatar: 'new-avatar',
      userUid: existingUser.uid
    });
  });
});
