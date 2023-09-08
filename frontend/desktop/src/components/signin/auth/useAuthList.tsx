import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { ApiResp, SystemEnv } from '@/types';
import { OauthProvider } from '@/types/user';
import { Button, Flex, Image } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { MouseEventHandler } from 'react';

const useAuthList = () => {
  const { data: platformEnv } = useQuery(['getPlatformEnv'], () =>
    request<any, ApiResp<SystemEnv>>('/api/platform/getEnv')
  );
  const {
    needGithub = false,
    needWechat = false,
    needGoogle = false,
    wechat_client_id = '',
    github_client_id = '',
    google_client_id = '',
    callback_url = ''
  } = platformEnv?.data ?? {};
  const { generateState, setProvider } = useSessionStore();

  const oauthLogin = async ({ url, provider }: { url: string; provider?: OauthProvider }) => {
    setProvider(provider);
    window.location.href = url;
  };

  const authList: { src: string; cb: MouseEventHandler; need: boolean }[] = [
    {
      src: '/images/github.svg',
      cb: (e) => {
        e.preventDefault();
        const state = generateState();
        oauthLogin({
          provider: 'github',
          url: `https://github.com/login/oauth/authorize?client_id=${github_client_id}&redirect_uri=${callback_url}&scope=user:email%20read:user&state=${state}`
        });
      },
      need: needGithub
    },
    {
      src: '/images/wechat.svg',
      cb: (e) => {
        e.preventDefault();
        const state = generateState();
        oauthLogin({
          provider: 'wechat',
          url: `https://open.weixin.qq.com/connect/qrconnect?appid=${wechat_client_id}&redirect_uri=${callback_url}&response_type=code&state=${state}&scope=snsapi_login&#wechat_redirect`
        });
      },
      need: needWechat
    },
    {
      src: '/images/wechat.svg',
      cb: (e) => {
        e.preventDefault();
        const state = generateState();
        const scope = encodeURIComponent(`https://www.googleapis.com/auth/userinfo.profile openid`);
        oauthLogin({
          provider: 'google',
          //https://www.googleapis.com/auth/userinfo.profile
          url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${google_client_id}&redirect_uri=${callback_url}&response_type=code&state=${state}&scope=${scope}&include_granted_scopes=true`
        });
      },
      need: needGoogle
    }
  ];

  const AuthList = () => {
    return (
      <Flex gap={'14px'}>
        {authList
          .filter((item) => item.need)
          .map((item, index) => (
            <Button key={index} onClick={item.cb} borderRadius={'full'} variant={'unstyled'}>
              <Image src={item.src} borderRadius={'full'} alt={item.src}></Image>
            </Button>
          ))}
      </Flex>
    );
  };

  return {
    AuthList
  };
};

export default useAuthList;
