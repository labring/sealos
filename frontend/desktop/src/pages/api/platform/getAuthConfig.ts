import { jsonRes } from '@/services/backend/response';
import {
  AppConfigType,
  DefaultAuthClientConfig,
  AuthConfigType,
  AuthClientConfigType
} from '@/types/system';
import { readFileSync } from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import yaml from 'js-yaml';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getAuthClientConfig();
  jsonRes(res, {
    data: config,
    code: 200
  });
}

// genResAuthConfig Return AuthConfigType with only necessary fields for response to client, to avoid exposing sensitive data
function genResAuthClientConfig(conf: AuthConfigType) {
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
        enabled: !!conf.idp.sms?.enabled
      },
      github: {
        enabled: !!conf.idp.github?.enabled,
        clientID: conf.idp.github?.clientID || ''
      },
      wechat: {
        enabled: !!conf.idp.wechat?.enabled,
        clientID: conf.idp.wechat?.clientID || ''
      },
      google: {
        enabled: !!conf.idp.google?.enabled,
        clientID: conf.idp.google?.clientID || ''
      },
      oauth2: {
        enabled: !!conf.idp.oauth2?.enabled,
        callbackURL: conf.idp.oauth2?.callbackURL || '',
        clientID: conf.idp.oauth2?.clientID || '',
        authURL: conf.idp.oauth2?.authURL || '',
        tokenURL: conf.idp.oauth2?.tokenURL || '',
        userInfoURL: conf.idp.oauth2?.userInfoURL || ''
      }
    },
    proxyAddress: conf.proxyAddress || '',
    baiduToken: conf.baiduToken || ''
  };
  return authClientConfig;
}

export async function getAuthClientConfig(): Promise<AuthClientConfigType> {
  try {
    if (process.env.NODE_ENV === 'development' || !global.AppConfig) {
      const filename =
        process.env.NODE_ENV === 'development' ? 'data/config.yaml.local' : '/app/data/config.yaml';
      global.AppConfig = yaml.load(readFileSync(filename, 'utf-8')) as AppConfigType;
    }
    return genResAuthClientConfig(global.AppConfig.desktop.auth);
  } catch (error) {
    console.log('-getAuthConfig-', error);
    return DefaultAuthClientConfig;
  }
}
