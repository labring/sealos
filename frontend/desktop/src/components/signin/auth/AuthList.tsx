import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { OauthProvider } from '@/types/user';
import { Button, Image, Flex, Icon, Center } from '@chakra-ui/react';
import { GithubIcon, GoogleIcon, WechatIcon } from '@sealos/ui';
import { useRouter } from 'next/router';
import { MouseEventHandler, useMemo } from 'react';
const AuthList = () => {
  const conf = useConfigStore().authConfig;

  const router = useRouter();

  const logo = useConfigStore().layoutConfig?.logo;

  const { generateState, setProvider } = useSessionStore();
  const authList: { icon: typeof Icon; cb: MouseEventHandler; need: boolean }[] = useMemo(() => {
    if (!conf) return [];
    const oauthLogin = async ({ url, provider }: { url: string; provider?: OauthProvider }) => {
      setProvider(provider);
      window.location.href = url;
    };
    const oauthProxyLogin = async ({
      state,
      provider,
      id
    }: {
      state: string;
      provider: OauthProvider;
      id: string;
    }) => {
      // if(!conf) return
      setProvider(provider);
      const target = new URL(conf.proxyAddress);
      const callback = new URL(conf.callbackURL);
      target.searchParams.append(
        'oauthProxyState',
        encodeURIComponent(callback.toString()) + '_' + state
      );
      target.searchParams.append('oauthProxyClientID', id);
      target.searchParams.append('oauthProxyProvider', provider);
      router.replace(target.toString());
    };
    return [
      {
        icon: GithubIcon,
        cb: (e) => {
          e.preventDefault();
          const state = generateState();
          const githubConf = conf?.idp.github;
          if (conf?.proxyAddress)
            oauthProxyLogin({
              provider: 'GITHUB',
              state,
              id: githubConf?.clientID as string
            });
          else
            oauthLogin({
              provider: 'GITHUB',
              url: `https://github.com/login/oauth/authorize?client_id=${githubConf?.clientID}&redirect_uri=${conf?.callbackURL}&scope=user:email%20read:user&state=${state}`
            });
        },
        need: conf.idp.github.enabled
      },
      {
        icon: WechatIcon,
        cb: (e) => {
          const wechatConf = conf?.idp.wechat;
          e.preventDefault();
          const state = generateState();
          if (conf.proxyAddress)
            oauthProxyLogin({
              provider: 'WECHAT',
              state,
              id: conf.idp.wechat?.clientID
            });
          else
            oauthLogin({
              provider: 'WECHAT',
              url: `https://open.weixin.qq.com/connect/qrconnect?appid=${wechatConf?.clientID}&redirect_uri=${conf?.callbackURL}&response_type=code&state=${state}&scope=snsapi_login&#wechat_redirect`
            });
        },
        need: conf?.idp.wechat?.enabled as boolean
      },
      {
        icon: GoogleIcon,
        cb: (e) => {
          e.preventDefault();
          const state = generateState();
          const googleConf = conf?.idp.google;
          const scope = encodeURIComponent(
            `https://www.googleapis.com/auth/userinfo.profile openid`
          );
          if (conf.proxyAddress)
            oauthProxyLogin({
              state,
              provider: 'GOOGLE',
              id: googleConf.clientID
            });
          else
            oauthLogin({
              provider: 'GOOGLE',
              url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleConf.clientID}&redirect_uri=${conf.callbackURL}&response_type=code&state=${state}&scope=${scope}&include_granted_scopes=true`
            });
        },
        need: conf.idp.google.enabled as boolean
      },
      {
        icon: () => (
          <Center>
            <Image alt="logo" width={'20px'} src={logo || '/logo.svg'}></Image>
          </Center>
        ),
        cb: (e) => {
          e.preventDefault();
          const state = generateState();
          const oauth2Conf = conf?.idp.oauth2;
          if (conf.proxyAddress)
            oauthProxyLogin({
              provider: 'OAUTH2',
              state,
              id: oauth2Conf.clientID as string
            });
          else
            oauthLogin({
              provider: 'OAUTH2',
              url: `${oauth2Conf?.authURL}?client_id=${oauth2Conf.clientID}&redirect_uri=${oauth2Conf.callbackURL}&response_type=code&state=${state}`
            });
        },
        need: conf.idp.oauth2?.enabled as boolean
      }
    ];
  }, [conf, logo, router]);

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
