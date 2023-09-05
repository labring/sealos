import useSessionStore from '@/stores/session';
import { Button, Flex, Image } from '@chakra-ui/react';
import { MouseEventHandler } from 'react';

type useAuthListProps = {
  needGithub: boolean;
  needWechat: boolean;
  wechat_client_id: string;
  github_client_id: string;
  callback_url: string;
};

const useAuthList = ({
  needGithub,
  needWechat,
  wechat_client_id,
  github_client_id,
  callback_url
}: useAuthListProps) => {
  const { generateState, setProvider } = useSessionStore();

  const oauthLogin = async ({ url, provider }: { url: string; provider?: 'github' | 'wechat' }) => {
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
