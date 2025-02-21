import { jsonRes } from '@/services/backend/response';
import {
  AppConfigType,
  AuthClientConfigType,
  AuthConfigType,
  DefaultAuthClientConfig
} from '@/types/system';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getAuthClientConfig();
  jsonRes(res, {
    data: config,
    code: 200
  });
}

// genResAuthConfig Return AuthConfigType with only necessary fields for response to client, to avoid exposing sensitive data
function genResAuthClientConfig(conf: AuthConfigType) {
  const captcha = conf.captcha;
  const authClientConfig: AuthClientConfigType = {
    callbackURL: conf.callbackURL || '',
    invite: {
      enabled: !!conf.invite?.enabled
    },
    idp: {
      password: {
        enabled: !!conf.idp.password?.enabled
      },
      sms: {
        enabled: !!conf.idp.sms?.enabled,
        ali: {
          enabled: !!conf.idp.sms?.ali?.enabled
        },
        email: {
          enabled: !!conf.idp.sms?.email?.enabled
        }
      },
      github: {
        enabled: !!conf.idp.github?.enabled,
        proxyAddress: conf.idp.github?.proxyAddress || '',
        clientID: conf.idp.github?.clientID || ''
      },
      wechat: {
        enabled: !!conf.idp.wechat?.enabled,
        clientID: conf.idp.wechat?.clientID || '',
        proxyAddress: conf.idp.wechat?.proxyAddress || ''
      },
      google: {
        enabled: !!conf.idp.google?.enabled,
        clientID: conf.idp.google?.clientID || '',
        proxyAddress: conf.idp.google?.proxyAddress || ''
      },
      oauth2: {
        enabled: !!conf.idp.oauth2?.enabled,
        callbackURL: conf.idp.oauth2?.callbackURL || '',
        clientID: conf.idp.oauth2?.clientID || '',
        authURL: conf.idp.oauth2?.authURL || '',
        tokenURL: conf.idp.oauth2?.tokenURL || '',
        userInfoURL: conf.idp.oauth2?.userInfoURL || '',
        proxyAddress: conf.idp.oauth2?.proxyAddress || ''
      }
    },
    captcha: {
      enabled: !!captcha?.enabled,
      ali: {
        enabled: !!captcha?.ali?.enabled,
        sceneId: captcha?.ali?.sceneId || '',
        prefix: captcha?.ali?.prefix || ''
      }
    },
    hasBaiduToken: !!conf.baiduToken,
    billingToken: ''
  };
  return authClientConfig;
}

export async function getAuthClientConfig(): Promise<AuthClientConfigType> {
  try {
    if (process.env.NODE_ENV === 'development' || !global.AppConfig) {
      const filename =
        process.env.NODE_ENV === 'development' ? 'data/config.local.yaml' : '/app/data/config.yaml';
      global.AppConfig = yaml.load(readFileSync(filename, 'utf-8')) as AppConfigType;
    }
    return genResAuthClientConfig(global.AppConfig.desktop.auth);
  } catch (error) {
    console.log('-getAuthConfig-', error);
    return DefaultAuthClientConfig;
  }
}
