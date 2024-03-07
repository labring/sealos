import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { ApiResp, SystemEnv } from '@/types';
import { OauthProvider } from '@/types/user';
import { Button, Flex, Icon } from '@chakra-ui/react';
import { GithubIcon, GoogleIcon, WechatIcon } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { MouseEventHandler } from 'react';
import { useRouter } from 'next/router';
const AuthList = () => {
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
    callback_url = '',
    // https://sealos.io/siginIn
    oauth_proxy = ''
  } = platformEnv?.data ?? {};
  const oauthLogin = async ({ url, provider }: { url: string; provider?: OauthProvider }) => {
    setProvider(provider);
    window.location.href = url;
  };
  const router = useRouter();
  const oauthProxyLogin = async ({
    state,
    provider,
    id
  }: {
    state: string;
    provider: OauthProvider;
    id: string;
  }) => {
    setProvider(provider);
    const target = new URL(oauth_proxy);
    const callback = new URL(callback_url);
    callback.searchParams.append('state', state);
    target.searchParams.append('oauthProxyState', callback.toString());
    target.searchParams.append('oauthProxyClientID', id);
    target.searchParams.append('oauthProxyProvider', provider);
    router.replace(target.toString());
  };
  const { generateState, setProvider } = useSessionStore();
  const authList: { icon: typeof Icon; cb: MouseEventHandler; need: boolean }[] = [
    {
      icon: GithubIcon,
      cb: (e) => {
        e.preventDefault();
        const state = generateState();
        if (oauth_proxy)
          oauthProxyLogin({
            provider: 'github',
            state,
            id: github_client_id
          });
        else
          oauthLogin({
            provider: 'github',
            url: `https://github.com/login/oauth/authorize?client_id=${github_client_id}&redirect_uri=${callback_url}&scope=user:email%20read:user&state=${state}`
          });
      },
      need: needGithub
    },
    {
      icon: WechatIcon,
      cb: (e) => {
        e.preventDefault();
        const state = generateState();
        if (oauth_proxy)
          oauthProxyLogin({
            provider: 'wechat',
            state,
            id: wechat_client_id
          });
        else
          oauthLogin({
            provider: 'wechat',
            url: `https://open.weixin.qq.com/connect/qrconnect?appid=${wechat_client_id}&redirect_uri=${callback_url}&response_type=code&state=${state}&scope=snsapi_login&#wechat_redirect`
          });
      },
      need: needWechat
    },
    {
      icon: GoogleIcon,
      cb: (e) => {
        e.preventDefault();
        const state = generateState();
        const scope = encodeURIComponent(`https://www.googleapis.com/auth/userinfo.profile openid`);
        if (oauth_proxy)
          oauthProxyLogin({
            state,
            provider: 'google',
            id: google_client_id
          });
        else
          oauthLogin({
            provider: 'google',
            url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${google_client_id}&redirect_uri=${callback_url}&response_type=code&state=${state}&scope=${scope}&include_granted_scopes=true`
          });
      },
      need: needGoogle
    }
  ];

  return (
    <Flex gap={'14px'}>
      {authList
        .filter((item) => item.need)
        .map((item, index) => (
          <Button
            key={index}
            onClick={item.cb}
            borderRadius={'full'}
            variant={'unstyled'}
            size={'xs'}
            w="32px"
            h="32px"
            bgColor={'rgba(255, 255, 255, 0.65)'}
          >
            <item.icon w="20px" h="20px" />
          </Button>
        ))}
    </Flex>
  );
};

export default AuthList;
