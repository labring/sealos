import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/auth', () => {
  const UserInfo = vi.fn(),
    getPlanInfo = vi.fn();
  return { UserInfo, getPlanInfo, _UserInfo: () => UserInfo, _getPlanInfo: () => getPlanInfo };
});

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn()
}));

const mockSetConfiguredSession = vi.fn();

vi.mock('@/stores/session', () => ({
  default: {
    getState: vi.fn(() => ({
      setConfiguredSession: mockSetConfiguredSession
    }))
  }
}));

import { UserInfo, getPlanInfo } from '@/api/auth';
import { jwtDecode } from 'jwt-decode';
import { sessionConfig } from '@/utils/sessionConfig';

describe('sessionConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(jwtDecode).mockReturnValue({
      userCrName: 'k8s-user',
      workspaceId: 'workspace-id',
      workspaceUid: 'workspace-uid',
      userCrUid: 'user-cr-uid',
      userId: 'user-id',
      userUid: 'user-uid'
    } as any);

    vi.mocked(UserInfo).mockResolvedValue({
      data: {
        info: {
          nickname: 'display-name',
          avatarUri: 'avatar-url',
          userRestrictedLevel: 1,
          realName: 'Real Name',
          enterpriseRealName: 'Enterprise Name',
          oauthProvider: [
            {
              providerType: 'EMAIL',
              providerId: 'user@example.com'
            }
          ]
        }
      }
    } as any);

    vi.mocked(getPlanInfo).mockResolvedValue({
      data: {
        subscription: { planName: 'pro' }
      }
    } as any);
  });

  it('persists username and email into session for downstream analytics variables', async () => {
    const productUserTraits = await sessionConfig({
      token: 'region-token',
      kubeconfig: 'kube-config',
      appToken: 'app-token'
    });

    expect(mockSetConfiguredSession).toHaveBeenCalledWith('region-token', {
      token: 'app-token',
      subscription: { planName: 'pro' },
      user: {
        userRestrictedLevel: 1,
        realName: 'Real Name',
        enterpriseRealName: 'Enterprise Name',
        k8s_username: 'k8s-user',
        username: 'display-name',
        email: 'user@example.com',
        name: 'display-name',
        avatar: 'avatar-url',
        nsid: 'workspace-id',
        ns_uid: 'workspace-uid',
        userCrUid: 'user-cr-uid',
        userId: 'user-id',
        userUid: 'user-uid'
      },
      kubeconfig: 'kube-config'
    });
    expect(productUserTraits).toEqual({
      user_username: 'display-name',
      user_name: 'display-name',
      user_email: 'user@example.com'
    });
  });
});
