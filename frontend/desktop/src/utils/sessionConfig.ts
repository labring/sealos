import { getPlanInfo, UserInfo } from '@/api/auth';
import { ProductUserTraits } from '@/types/analytics';
import { jwtDecode } from 'jwt-decode';
import { AccessTokenPayload } from '@/types/token';
import useSessionStore from '@/stores/session';
import { SemData } from '@/types/sem';
import { AdClickData } from '@/types/adClick';

const cleanTraitValue = (value?: string | null) => {
  if (value === undefined || value === null) return '';
  const normalized = String(value).trim();
  return normalized === 'undefined' || normalized === 'null' ? '' : normalized;
};

export const sessionConfig = async ({
  token,
  kubeconfig,
  appToken
}: {
  token: string;
  kubeconfig: string;
  appToken: string;
}): Promise<ProductUserTraits> => {
  const store = useSessionStore.getState();
  store.setToken(token); // Sets region token for API requests
  const payload = jwtDecode<AccessTokenPayload>(token);
  const [infoData, planInfo] = await Promise.all([UserInfo(), getPlanInfo(payload.workspaceId)]);
  const primaryEmail = cleanTraitValue(
    infoData.data?.info.oauthProvider?.find((provider) => provider.providerType === 'EMAIL')
      ?.providerId
  );
  const productUserTraits: ProductUserTraits = {
    user_username: cleanTraitValue(infoData.data?.info.nickname),
    user_name: cleanTraitValue(infoData.data?.info.nickname),
    user_email: primaryEmail
  };

  store.setSession({
    token: appToken,
    subscription: planInfo.data.subscription,
    user: {
      userRestrictedLevel: infoData.data?.info.userRestrictedLevel || undefined,
      realName: infoData.data?.info.realName || undefined,
      enterpriseRealName: infoData.data?.info.enterpriseRealName || undefined,
      k8s_username: payload.userCrName,
      username: cleanTraitValue(infoData.data?.info.nickname),
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

  const sessionStore = useSessionStore.getState();
  sessionStore.setHasEverLoggedIn(true);

  return productUserTraits;
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
