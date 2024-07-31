import { getWechatQR, getWechatResult } from '@/api/platform';
import useSessionStore from '@/stores/session';
import { Box, Image, useToast } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect } from 'react';
import { UserInfo } from '@/api/auth';
import { jwtDecode } from 'jwt-decode';
import { AccessTokenPayload } from '@/types/token';

export default function useWechat() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setSession, setToken } = useSessionStore();

  const [wechatInfo, setwechatInfo] = React.useState<{
    code: string;
    codeUrl: string;
  }>();

  const login = React.useCallback(() => {
    getWechatQR().then((res) => {
      console.log(res);
      setwechatInfo(res.data);
    });
  }, []);

  const { data, isSuccess } = useQuery(
    ['getWechatResult', wechatInfo?.code],
    () => getWechatResult({ code: wechatInfo?.code || '' }),
    {
      refetchInterval: 3 * 1000,
      enabled: !!wechatInfo?.code
    }
  );
  useEffect(() => {
    (async () => {
      if (isSuccess && data && data.code === 200 && data.data) {
        const regionUserToken = data.data.token;
        setToken(regionUserToken);
        const infoData = await UserInfo();
        const payload = jwtDecode<AccessTokenPayload>(regionUserToken);
        setSession({
          token: regionUserToken,
          user: {
            k8s_username: payload.userCrName,
            name: infoData.data?.info.nickname || '',
            avatar: infoData.data?.info.avatarUri || '',
            nsid: payload.workspaceId,
            ns_uid: payload.workspaceUid,
            userCrUid: payload.userCrUid,
            userUid: payload.userUid,
            userId: payload.userId,
            realName: infoData.data?.info.realName || undefined,
            userRestrictedLevel: infoData.data?.info.userRestrictedLevel || undefined
          },
          // @ts-ignore
          kubeconfig: result.data.kubeconfig
        });
        return router.replace('/');
      }
    })();
  }, [data, isSuccess]);

  const WechatComponent = useCallback(
    () => (
      <Box p={5}>
        {wechatInfo?.codeUrl && <Image w="200px" src={wechatInfo?.codeUrl} alt="qrcode"></Image>}
      </Box>
    ),
    [wechatInfo?.codeUrl]
  );

  return {
    login,
    WechatComponent
  };
}
