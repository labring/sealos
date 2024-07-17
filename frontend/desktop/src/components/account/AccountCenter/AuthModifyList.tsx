import { useConfigStore } from '@/stores/config';
import useSessionStore, { OauthAction } from '@/stores/session';
import { OauthProvider } from '@/types/user';
import { Text, Image, Center } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import router from 'next/router';
import { useMemo } from 'react';
import { ConfigItem } from './ConfigItem';
import { BINDING_STATE_MODIFY_BEHAVIOR, BindingModifyButton } from './BindingModifyButton';

export function AuthModifyList({
  isOnlyOne,
  GITHUBIsBinding,
  WECHATIsBinding,
  GOOGLEIsBinding,
  avatarUrl
}: {
  isOnlyOne: boolean;
  avatarUrl: string;
  GOOGLEIsBinding: boolean;
  GITHUBIsBinding: boolean;
  WECHATIsBinding: boolean;
}) {
  const { authConfig: conf, layoutConfig } = useConfigStore();
  const { setProvider, generateState } = useSessionStore();
  const { t } = useTranslation();
  const authActionList: {
    title: string;
    actionCb: (actino: OauthAction) => void;
    isBinding: boolean;
  }[] = useMemo(() => {
    if (!conf) return [];
    const actionCbGen =
      <T extends OauthAction>({
        url,
        provider,
        clientId
      }: {
        url: string;
        provider: OauthProvider;
        clientId: string;
      }) =>
      (action: T) => {
        const state = generateState(action);
        setProvider(provider);
        if (conf.proxyAddress) {
          const target = new URL(conf.proxyAddress);
          const callback = new URL(conf.callbackURL);
          target.searchParams.append(
            'oauthProxyState',
            encodeURIComponent(callback.toString()) + '_' + state
          );
          target.searchParams.append('oauthProxyClientID', clientId);
          target.searchParams.append('oauthProxyProvider', provider);
          router.replace(target.toString());
        } else {
          const target = new URL(url);
          target.searchParams.append('state', state);
          router.replace(target);
        }
      };
    const result = [];
    if (conf.idp.github.enabled)
      result.push({
        title: t('common:github'),
        isBinding: GITHUBIsBinding,
        actionCb(action: Exclude<OauthAction, 'LOGIN' | 'PROXY'>) {
          const githubConf = conf.idp.github;
          return actionCbGen({
            provider: 'GITHUB',
            clientId: githubConf.clientID,
            url: `https://github.com/login/oauth/authorize?client_id=${githubConf?.clientID}&redirect_uri=${conf?.callbackURL}&scope=user:email%20read:user`
          })(action);
        }
      });

    if (conf.idp.wechat.enabled)
      result.push({
        title: t('common:wechat'),
        isBinding: WECHATIsBinding,
        actionCb(action: Exclude<OauthAction, 'LOGIN'>) {
          const wechatConf = conf.idp.wechat;
          return actionCbGen({
            provider: 'WECHAT',
            clientId: wechatConf.clientID,
            url: `https://open.weixin.qq.com/connect/qrconnect?appid=${wechatConf?.clientID}&redirect_uri=${conf?.callbackURL}&response_type=code&scope=snsapi_login&#wechat_redirect`
          })(action);
        }
      });
    if (conf.idp.google.enabled)
      result.push({
        title: t('common:google'),
        isBinding: GOOGLEIsBinding,
        actionCb(action: Exclude<OauthAction, 'LOGIN'>) {
          const googleConf = conf.idp.google;
          const scope = encodeURIComponent(
            `https://www.googleapis.com/auth/userinfo.profile openid`
          );
          return actionCbGen({
            provider: 'GOOGLE',
            clientId: googleConf.clientID,
            url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleConf.clientID}&redirect_uri=${conf.callbackURL}&response_type=code&scope=${scope}&include_granted_scopes=true`
          })(action);
        }
      });
    return result;
  }, [conf, t, GITHUBIsBinding, WECHATIsBinding, GOOGLEIsBinding]);
  return authActionList.map((auth) => {
    return (
      <ConfigItem
        key={auth.title}
        LeftElement={<Text>{auth.title}</Text>}
        RightElement={
          <>
            {auth.isBinding ? (
              <Center boxSize={'48px'} bg={'grayModern.150'} borderRadius="full">
                <Image
                  objectFit={'cover'}
                  borderRadius="full"
                  src={avatarUrl}
                  fallbackSrc={'/images/default-user.svg'}
                  alt="user avator"
                  draggable={'false'}
                />
              </Center>
            ) : (
              <Text>{t('common:unbound')}</Text>
            )}
            {(!auth.isBinding || !isOnlyOne) && (
              <BindingModifyButton
                onClick={(e) => {
                  e.preventDefault();
                  auth.isBinding ? auth.actionCb('UNBIND') : auth.actionCb('BIND');
                }}
                modifyBehavior={
                  auth.isBinding
                    ? BINDING_STATE_MODIFY_BEHAVIOR.UNBINDING
                    : BINDING_STATE_MODIFY_BEHAVIOR.BINDING
                }
              />
            )}
          </>
        }
      ></ConfigItem>
    );
  });
}
