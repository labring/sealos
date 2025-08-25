import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { ProviderType } from 'prisma/global/generated/client';
import { globalPrisma } from '@/services/backend/db/init';
import { checkCode } from '../db/mergeUserCode';
import { USER_MERGE_STATUS } from '@/types/response/merge';

export const filterMergeUser = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { providerType: ProviderType; providerId: string }) => Promise<void>
) => {
  const { code, providerType } = req.body as {
    providerType?: ProviderType;
    code?: string;
  };
  if (!code)
    return jsonRes(res, {
      code: 400,
      message: 'invalid code'
    });
  if (
    providerType === undefined ||
    providerType === null ||
    !Object.values(ProviderType).includes(providerType)
  )
    return jsonRes(res, {
      code: 400,
      message: 'invalid providerType'
    });
  const result = await checkCode({ providerType, code });
  if (!result)
    return jsonRes(res, {
      code: 409,
      message: 'invalid code'
    });
  const providerId = result.providerId;
  await next({
    providerType,
    providerId
  });
};

export const mergeUserGuard =
  (userUid: string, providerType: ProviderType, providerId: string) =>
  async (res: NextApiResponse, next: (data: { mergeUserUid: string }) => Promise<void>) => {
    const mergeUserOauthprovider = await globalPrisma.oauthProvider.findUnique({
      where: {
        providerId_providerType: {
          providerType,
          providerId
        }
      }
    });
    if (!mergeUserOauthprovider)
      return jsonRes(res, {
        code: 404,
        message: USER_MERGE_STATUS.OAUTH_PROVIDER_NOT_FOUND
      });

    const mergeUserUid = mergeUserOauthprovider.userUid;
    const mergeUser = await globalPrisma.user.findUnique({
      where: {
        uid: mergeUserUid
      },
      include: {
        oauthProvider: true
      }
    });

    if (!mergeUser)
      return jsonRes(res, {
        code: 404,
        message: USER_MERGE_STATUS.USER_NOT_FOUND
      });
    const user = await globalPrisma.user.findUnique({
      where: {
        uid: userUid
      },
      include: {
        oauthProvider: true
      }
    });
    if (!user)
      return jsonRes(res, {
        code: 404,
        message: USER_MERGE_STATUS.USER_NOT_FOUND
      });
    const curTypeList = user.oauthProvider.map((oauthProvider) => oauthProvider.providerType);
    const canMerge = mergeUser.oauthProvider.every((o) => !curTypeList.includes(o.providerType));
    if (!canMerge)
      return jsonRes(res, {
        code: 409,
        message: USER_MERGE_STATUS.EXIST_SAME_OAUTH_PROVIDER
      });
    await next({
      mergeUserUid
    });
  };
