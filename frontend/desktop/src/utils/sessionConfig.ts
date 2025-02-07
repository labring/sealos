import { UserInfo } from '@/api/auth';
import { jwtDecode } from 'jwt-decode';
import { AccessTokenPayload } from '@/types/token';
import useSessionStore from '@/stores/session';
import { SemData } from '@/types/sem';

export const sessionConfig = async ({
  token,
  kubeconfig,
  appToken
}: {
  token: string;
  kubeconfig: string;
  appToken: string;
}) => {
  const store = useSessionStore.getState();
  store.setToken(token);
  const infoData = await UserInfo();
  const payload = jwtDecode<AccessTokenPayload>(token);
  store.setSession({
    token: appToken,
    user: {
      userRestrictedLevel: infoData.data?.info.userRestrictedLevel || undefined,
      realName: infoData.data?.info.realName || undefined,
      enterpriseRealName: infoData.data?.info.enterpriseRealName || undefined,
      k8s_username: payload.userCrName,
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
};

export const getInviterId = () => localStorage.getItem('inviterId');

export const setInviterId = (id: string) => localStorage.setItem('inviterId', id);

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

export const getBaiduId = () => localStorage.getItem('bd_vid');

export const setBaiduId = (id: string) => localStorage.setItem('bd_vid', id);
