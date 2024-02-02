import { getWechatQR, getWechatResult } from '@/api/platform';
import useSessionStore from '@/stores/session';
import { Box, Image, useToast } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';

export default function useWechat() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setSession } = useSessionStore();

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

  useQuery(
    ['getWechatResult', wechatInfo?.code],
    () => getWechatResult({ code: wechatInfo?.code || '' }),
    {
      refetchInterval: 3 * 1000,
      enabled: !!wechatInfo?.code,
      onSuccess(data) {
        console.log(data);
        if (data.code === 200 && data.data) {
          setSession(data.data);
          router.replace('/');
        }
      }
    }
  );

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
