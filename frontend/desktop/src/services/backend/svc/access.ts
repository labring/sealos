import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '../response';
import { ProviderType } from 'prisma/global/generated/client';
import { getGlobalToken } from '../globalAuth';
import { use } from 'react';
import { SemData } from '@/types/sem';

export const getGlobalTokenSvc =
  (
    avatar_url: string,
    providerId: string,
    name: string,
    providerType: ProviderType,
    password?: string,
    inviterId?: string,
    semData?: SemData,
    bdVid?: string
  ) =>
  async (res: NextApiResponse, next?: () => void) => {
    const data = await getGlobalToken({
      provider: providerType,
      providerId,
      avatar_url,
      name,
      inviterId,
      password,
      semData,
      bdVid
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
  semData?: SemData,
  bdVid?: string
) =>
  getGlobalTokenSvc(
    avatar_url,
    providerId,
    name,
    ProviderType.GITHUB,
    undefined,
    inviterId,
    semData,
    bdVid
  );
export const getGlobalTokenByWechatSvc = (
  avatar_url: string,
  providerId: string,
  name: string,
  inviterId?: string,
  semData?: SemData,
  bdVid?: string
) =>
  getGlobalTokenSvc(
    avatar_url,
    providerId,
    name,
    ProviderType.WECHAT,
    undefined,
    inviterId,
    semData,
    bdVid
  );
export const getGlobalTokenByPhoneSvc = (
  phone: string,
  inviterId?: string,
  semData?: SemData,
  bdVid?: string
) => getGlobalTokenSvc('', phone, phone, ProviderType.PHONE, undefined, inviterId, semData, bdVid);
export const getGlobalTokenByPasswordSvc = (name: string, password: string, inviterId?: string) =>
  getGlobalTokenSvc('', name, name, ProviderType.PASSWORD, password, inviterId);
export const getGlobalTokenByGoogleSvc = (
  avatar_url: string,
  providerId: string,
  name: string,
  inviterId?: string,
  semData?: SemData,
  bdVid?: string
) =>
  getGlobalTokenSvc(
    avatar_url,
    providerId,
    name,
    ProviderType.GOOGLE,
    undefined,
    inviterId,
    semData,
    bdVid
  );
