import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '../response';
import { isNumber } from 'lodash';
import { TgithubToken, TgithubUser, TWechatToken, TWechatUser } from '@/types/user';
import * as jwt from 'jsonwebtoken';
import { userCanMerge } from '@/utils/tools';
import { ProviderType } from 'prisma/global/generated/client';
import { globalPrisma } from '../db/init';
import { addOrUpdateCode } from '../db/mergeUserCode';
import { v4 } from 'uuid';
import { BIND_STATUS } from '@/types/response/bind';
import { UNBIND_STATUS } from '@/types/response/unbind';
import { SemData } from '@/types/sem';
import axios from 'axios';
import { AdClickData } from '@/types/adClick';

export const OauthCodeFilter = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: {
    code: string;
    inviterId?: string;
    semData?: SemData;
    adClickData?: AdClickData;
  }) => void
) => {
  const { code, inviterId, semData, adClickData } = req.body as {
    code?: string;
    inviterId?: string;
    semData?: SemData;
    adClickData?: AdClickData;
  };
  if (!code) {
    return jsonRes(res, {
      message: 'code is invalid',
      code: 400
    });
  }

  await Promise.resolve(
    next?.({
      code,
      inviterId,
      semData,
      adClickData
    })
  );
};

export const OAuthEnvFilter =
  (clientId?: string, clientSecret?: string) =>
  async (next?: (d: { clientID: string; clientSecret: string }) => void) => {
    if (!clientId) throw Error('clientID NOT FOUND');
    if (!clientSecret) throw Error('clientSecret NOT FOUND');
    await Promise.resolve(next?.({ clientID: clientId, clientSecret }));
  };

// the env will be changeds
export const wechatOAuthEnvFilter = () =>
  OAuthEnvFilter(
    global.AppConfig?.desktop.auth.idp.wechat?.clientID,
    global.AppConfig?.desktop.auth.idp.wechat?.clientSecret
  );
export const githubOAuthEnvFilter = () =>
  OAuthEnvFilter(
    global.AppConfig?.desktop.auth.idp.github?.clientID,
    global.AppConfig?.desktop.auth.idp.github?.clientSecret
  );
export const googleOAuthEnvFilter = () => {
  return (next?: (d: { clientID: string; clientSecret: string; callbackURL: string }) => void) =>
    OAuthEnvFilter(
      global.AppConfig?.desktop.auth.idp.google?.clientID,
      global.AppConfig?.desktop.auth.idp.google?.clientSecret
    )(async (originData) => {
      const callbackURL = global.AppConfig?.desktop.auth.callbackURL;
      if (!callbackURL) throw Error('callbackURL NOT FOUND');
      await Promise.resolve(
        next?.({
          ...originData,
          callbackURL
        })
      );
    });
};

export const googleOAuthGuard =
  (clientId: string, clientSecret: string, code: string, callbackUrl: string) =>
  async (
    res: NextApiResponse,
    next: (data: { id: string; name: string; avatar_url: string; email: string }) => void
  ) => {
    const url = `https://oauth2.googleapis.com/token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${callbackUrl}&grant_type=authorization_code`;
    const response = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' } });
    if (!response.ok)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    const __data = (await response.json()) as {
      access_token: string;
      scope: string;
      token_type: string;
      id_token: string;
    };
    const userInfo = jwt.decode(__data.id_token) as {
      iss: string;
      azp: string;
      aud: string;
      sub: string;
      at_hash: string;
      name: string;
      picture: string;
      email: string;
      given_name: string;
      family_name: string;
      locale: string;
      iat: number;
      exp: number;
    };
    const name = userInfo.name;
    const id = userInfo.sub;
    const avatar_url = userInfo.picture;

    if (!id) throw Error('get userInfo error');

    let email = '';
    if (__data.access_token) {
      try {
        const userinfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
        const userinfoResponse = await fetch(userinfoUrl, {
          headers: {
            Authorization: `Bearer ${__data.access_token}`,
            Accept: 'application/json'
          }
        });

        if (userinfoResponse.ok) {
          const userinfoData: {
            email: string;
          } = await userinfoResponse.json();

          email = userinfoData.email || userInfo.email || '';
        }
      } catch (error) {
        console.error('get google email error:', error);
      }
    }

    // @ts-ignore
    await Promise.resolve(
      next?.({
        id,
        name,
        avatar_url,
        email
      })
    );
  };

export const githubOAuthGuard =
  (clientId: string, clientSecret: string, code: string) =>
  async (
    res: NextApiResponse,
    next: (data: { id: string; name: string; avatar_url: string; email: string }) => void
  ) => {
    const apiClient = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/json'
      }
    });
    const accessClient = axios.create({
      baseURL: 'https://github.com',
      headers: {
        Accept: 'application/json'
      }
    });
    // console.log('get access token');
    const result1 = await accessClient.post<TgithubToken>(
      `/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`
    );
    // console.log('get access token success');
    const __data = result1.data;
    const access_token = __data.access_token;
    if (!access_token) {
      return jsonRes(res, {
        message: 'Failed to authenticate with GitHub, access_token is null',
        code: 401
      });
    }
    // console.log('get userinfo ');
    const userResult = await apiClient.get<TgithubUser>('/user', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    // console.log('get userinfo end');
    const id = userResult.data?.id;
    if (!isNumber(id)) {
      jsonRes(res, {
        message: 'Failed to authenticate with GitHub, id is null',
        code: 401
      });
      return;
    }
    let email = '';
    try {
      const emailResult = await apiClient.get<
        {
          email: string;
          primary: boolean;
          verified: boolean;
          visibility: string | null;
        }[]
      >('/user/emails', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      // console.log('get github email end');
      const emails = emailResult.data;
      const primaryEmail = emails.find((e) => e.primary && e.verified);
      // prefer primary email
      if (primaryEmail) {
        email = primaryEmail.email;
      } else {
        // next verified email
        const verifiedEmail = emails.find((e) => e.verified);
        if (verifiedEmail) {
          email = verifiedEmail.email;
        } else if (emails.length > 0) {
          // no verified email, use first email
          email = emails[0].email;
        }
      }
    } catch (error) {
      console.error('failed to fetch user github emails:', error);
    }

    // @ts-ignore
    await Promise.resolve(
      next?.({
        id: id + '',
        name: userResult.data.login,
        avatar_url: userResult.data.avatar_url,
        email
      })
    );
  };

export const wechatOAuthGuard =
  (clientId: string, clientSecret: string, code: string) =>
  async (
    res: NextApiResponse,
    next: (data: { id: string; name: string; avatar_url: string }) => void
  ) => {
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${clientId}&secret=${clientSecret}&code=${code}&grant_type=authorization_code`;
    const { access_token, openid } = (await (
      await fetch(url, { headers: { Accept: 'application/json' } })
    ).json()) as TWechatToken;

    if (!access_token || !openid) {
      return jsonRes(res, {
        message: 'Failed to authenticate with wechat',
        code: 401,
        data: 'access_token is null'
      });
    }
    const userUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`;
    const response = await fetch(userUrl);
    if (!response.ok)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    const result = (await response.json()) as TWechatUser;
    const id = result.unionid;
    if (!id) throw Error('get wechat unionid error');
    const name = result.nickname;
    const avatar_url = result.headimgurl;
    return await Promise.resolve(
      next?.({
        id,
        name,
        avatar_url
      })
    );
  };

export const bindGuard =
  (providerType: ProviderType) =>
  (providerId: string, userUid: string) =>
  async (res: NextApiResponse, next?: () => void) => {
    const oauthProvider = await globalPrisma.oauthProvider.findUnique({
      where: {
        providerId_providerType: {
          providerType,
          providerId
        }
      }
    });
    // already exist user
    if (oauthProvider) {
      if (providerType === 'EMAIL')
        return jsonRes(res, {
          code: 409,
          message: BIND_STATUS.MERGE_USER_PROVIDER_CONFLICT
        });
      const mergeUserUid = oauthProvider.userUid;
      const [mergeUserOauthProviders, curUserOauthProviders] = await globalPrisma.$transaction([
        globalPrisma.oauthProvider.findMany({
          where: {
            userUid: mergeUserUid
          }
        }),
        globalPrisma.oauthProvider.findMany({
          where: {
            userUid
          }
        })
      ]);
      const canMerge = userCanMerge(mergeUserOauthProviders, curUserOauthProviders);
      if (!canMerge) {
        return jsonRes(res, {
          code: 409,
          message: BIND_STATUS.MERGE_USER_PROVIDER_CONFLICT
        });
      } else {
        const code = v4();
        await addOrUpdateCode({
          providerId,
          providerType,
          code
        });
        return jsonRes(res, {
          code: 203,
          message: BIND_STATUS.MERGE_USER_CONTINUE,
          data: {
            code
          }
        });
      }
    } else {
      await Promise.resolve(next?.());
    }
  };

export const unbindGuard =
  (providerType: ProviderType) =>
  (providerId: string, userUid: string) =>
  async (res: NextApiResponse, next?: () => void) => {
    const oauthProvider = await globalPrisma.oauthProvider.findUnique({
      where: {
        providerId_providerType: {
          providerType,
          providerId
        },
        userUid
      }
    });
    if (!oauthProvider)
      return jsonRes(res, {
        code: 409,
        message: UNBIND_STATUS.PROVIDER_NOT_FOUND
      });
    await Promise.resolve(next?.());
  };
export const unbindPhoneGuard = unbindGuard(ProviderType.PHONE);
export const bindPhoneGuard = bindGuard(ProviderType.PHONE);
export const bindEmailGuard = bindGuard(ProviderType.EMAIL);
export const unbindEmailGuard = unbindGuard(ProviderType.EMAIL);
export const unbindGithubGuard = unbindGuard(ProviderType.GITHUB);
export const bindGithubGuard = bindGuard(ProviderType.GITHUB);
export const unbindGoogleGuard = unbindGuard(ProviderType.GOOGLE);
export const bindGoogleGuard = bindGuard(ProviderType.GOOGLE);
export const unbindWechatGuard = unbindGuard(ProviderType.WECHAT);
export const bindWechatGuard = bindGuard(ProviderType.WECHAT);
