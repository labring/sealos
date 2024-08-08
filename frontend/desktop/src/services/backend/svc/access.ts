import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '../response';
import { ProviderType } from 'prisma/global/generated/client';
import { getGlobalToken } from '../globalAuth';
import { use } from 'react';

export const getGlobalTokenSvc =
  (
    avatar_url: string,
    providerId: string,
    name: string,
    providerType: ProviderType,
    password?: string,
    inviterId?: string,
    userSemChannel?: string
  ) =>
  async (res: NextApiResponse, next?: () => void) => {
    const data = await getGlobalToken({
      provider: providerType,
      providerId,
      avatar_url,
      name,
      inviterId,
      password,
      userSemChannel
    });
    if (!data)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    return jsonRes(res, {
      data,
      code: 200,
      message: 'Successfully'
    });
  };

export const getGlobalTokenByGithubSvc = (
  avatar_url: string,
  providerId: string,
  name: string,
  inviterId?: string,
  userSemChannel?: string
) =>
  getGlobalTokenSvc(
    avatar_url,
    providerId,
    name,
    ProviderType.GITHUB,
    undefined,
    inviterId,
    userSemChannel
  );
export const getGlobalTokenByWechatSvc = (
  avatar_url: string,
  providerId: string,
  name: string,
  inviterId?: string,
  userSemChannel?: string
) =>
  getGlobalTokenSvc(
    avatar_url,
    providerId,
    name,
    ProviderType.WECHAT,
    undefined,
    inviterId,
    userSemChannel
  );
export const getGlobalTokenByPhoneSvc = (
  phone: string,
  inviterId?: string,
  userSemChannel?: string
) => getGlobalTokenSvc('', phone, phone, ProviderType.PHONE, undefined, inviterId, userSemChannel);
export const getGlobalTokenByPasswordSvc = (name: string, password: string, inviterId?: string) =>
  getGlobalTokenSvc('', name, name, ProviderType.PASSWORD, password, inviterId);
export const getGlobalTokenByGoogleSvc = (
  avatar_url: string,
  providerId: string,
  name: string,
  inviterId?: string,
  userSemChannel?: string
) =>
  getGlobalTokenSvc(
    avatar_url,
    providerId,
    name,
    ProviderType.GOOGLE,
    undefined,
    inviterId,
    userSemChannel
  );
