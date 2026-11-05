import { _getPlanInfo, _UserInfo } from '@/api/auth';
import axios from 'axios';
import { ProductUserTraits } from '@/types/analytics';
import { jwtDecode } from 'jwt-decode';
import { AccessTokenPayload } from '@/types/token';
import useSessionStore from '@/stores/session';
import { SemData } from '@/types/sem';
import { AdClickData } from '@/types/adClick';
import {
  beginSessionConfiguration,
  endSessionConfiguration,
  establishWebSession,
  isSessionConfigurationCurrent
} from '@/services/web-session';

type SessionCredentials = { token: string; kubeconfig: string; appToken: string };

// 只有取得新登录证明的入口建立长期会话；工作空间配置不重新验证旧 global token。
export const loginSessionConfig = (credentials: SessionCredentials) =>
  configureSession(credentials, true);
export const sessionConfig = (credentials: SessionCredentials) =>
  configureSession(credentials, false);

const configureSession = async (
  { token, kubeconfig, appToken }: SessionCredentials,
  login: boolean
): Promise<ProductUserTraits> => {
  const operation = beginSessionConfiguration();
  try {
    if (login) await establishWebSession(operation.globalToken);
    if (!isSessionConfigurationCurrent(operation))
      throw { code: 409, message: 'Session context changed' };
    const payload = jwtDecode<AccessTokenPayload>(token);
    // 预加载只使用新凭证，不先改全局 store，也不经过旧工作空间的恢复拦截器。
    const scoped = axios.create({
      baseURL: '/',
      withCredentials: true,
      timeout: 20000,
      headers: { Authorization: encodeURIComponent(token), 'Content-Type': 'application/json' }
    });
    scoped.interceptors.response.use(
      (response) => {
        if (
          !response.data ||
          (response.data.code && (response.data.code < 200 || response.data.code >= 300))
        )
          throw { code: response.data?.code || 503, message: 'Unable to load session information' };
        return response.data;
      },
      (error) =>
        Promise.reject({
          code: error.response?.status || 503,
          message: 'Unable to load session information'
        })
    );
    const [infoData, planInfo] = await Promise.all([
      _UserInfo(scoped)(),
      _getPlanInfo(scoped)(payload.workspaceId)
    ]);
    if (!isSessionConfigurationCurrent(operation))
      throw { code: 409, message: 'Session context changed' };
    const primaryEmail =
      infoData.data?.info.oauthProvider?.find((provider) => provider.providerType === 'EMAIL')
        ?.providerId || '';
    const productUserTraits: ProductUserTraits = {
      user_username: infoData.data?.info.nickname || '',
      user_name: infoData.data?.info.nickname || '',
      user_email: primaryEmail
    };

    useSessionStore.getState().setConfiguredSession(token, {
      token: appToken,
      subscription: planInfo.data.subscription,
      user: {
        userRestrictedLevel: infoData.data?.info.userRestrictedLevel || undefined,
        realName: infoData.data?.info.realName || undefined,
        enterpriseRealName: infoData.data?.info.enterpriseRealName || undefined,
        k8s_username: payload.userCrName,
        username: infoData.data?.info.nickname || '',
        email: primaryEmail,
        name: infoData.data?.info.nickname || '',
        avatar: infoData.data?.info.avatarUri || '',
        nsid: payload.workspaceId,
        ns_uid: payload.workspaceUid,
        userCrUid: payload.userCrUid,
        userId: payload.userId,
        userUid: payload.userUid
      },
      kubeconfig
    });

    return productUserTraits;
  } finally {
    endSessionConfiguration(operation);
  }
};

export const getUserSemData = (): SemData | null => {
  const semDataString = localStorage.getItem('sealos_sem');
  if (semDataString) {
    return JSON.parse(semDataString);
  }
  return null;
};

export const setUserSemData = (data: SemData): void => {
  localStorage.setItem('sealos_sem', JSON.stringify(data));
};

export const getAdClickData = (): AdClickData | null => {
  const adClickString = localStorage.getItem('ad_click');
  if (adClickString) {
    return JSON.parse(adClickString);
  }

  return null;
};

export const setAdClickData = (data: AdClickData) => {
  localStorage.setItem('ad_click', JSON.stringify(data));
};
