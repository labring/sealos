import { getSystemEnv } from '@/api/system';
import { GithubIcon, GoogleIcon, WechatIcon } from '@/components/Icon';
import useSessionStore from '@/stores/session';
import { OauthProvider } from '@/types/user';
import { Button, Flex, Icon } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { MouseEventHandler } from 'react';

const useAuthList = () => {
  const { data: platformEnv } = useQuery(['getPlatformEnv'], getSystemEnv);

  const {
    needGithub = false,
    needWechat = false,
    needGoogle = false,
    wechat_client_id = '',
    github_client_id = '',
    google_client_id = '',
    callback_url = ''
  } = platformEnv || {};
  const { generateState, setProvider } = useSessionStore();

  const oauthLogin = async ({ url, provider }: { url: string; provider?: OauthProvider }) => {
    setProvider(provider);
    window.location.href = url;
  };

  const authList: { icon: typeof Icon; cb: MouseEventHandler; need: boolean }[] = [
    {
      // src: '/images/github.svg',
      icon: GithubIcon,
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
      icon: WechatIcon,
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
      icon: GoogleIcon,
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

  return {
    AuthList
  };
};

export default useAuthList;
