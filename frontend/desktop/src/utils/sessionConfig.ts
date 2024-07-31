import { UserInfo } from '@/api/auth';
import { jwtDecode } from 'jwt-decode';
import { AccessTokenPayload } from '@/types/token';
import useSessionStore from '@/stores/session';

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
