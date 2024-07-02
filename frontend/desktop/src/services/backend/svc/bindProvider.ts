import { globalPrisma } from '../db/init';
import { NextApiResponse } from 'next';
import { ProviderType } from 'prisma/global/generated/client';
import { jsonRes } from '../response';
import { findUser } from '../globalAuth';
import { BIND_STATUS } from '@/types/response/bind';
import { CHANGE_BIND_STATUS } from '@/types/response/changeBind';
import { UNBIND_STATUS } from '@/types/response/unbind';
import { PROVIDER_STATUS } from '@/types/response/utils';
async function addOauthProvider({
  providerType,
  providerId,
  userUid
}: {
  providerType: ProviderType;
  providerId: string;
  userUid: string;
}) {
  try {
    const oauthProvider = await globalPrisma.oauthProvider.create({
      data: {
        providerId,
        providerType,
        user: {
          connect: {
            uid: userUid
          }
        }
      }
    });
    if (!oauthProvider) return null;
    return {
      oauthProvider
    };
  } catch (e) {
    return null;
  }
}

async function removeOauthProvider({
  provider,
  id,
  userUid
}: {
  provider: ProviderType;
  id: string;
  userUid: string;
}) {
  try {
    const oauthProvider = await globalPrisma.oauthProvider.delete({
      where: {
        providerId_providerType: {
          providerId: id,
          providerType: provider
        },
        userUid
      }
    });
    if (!oauthProvider) return null;
    return {
      oauthProvider
    };
  } catch (e) {
    return null;
  }
}

async function updateOauthProvider({
  provider,
  newId,
  oldId,
  userUid
}: {
  provider: ProviderType;
  oldId: string;
  newId: string;
  userUid: string;
}) {
  try {
    const oauthProvider = await globalPrisma.oauthProvider.update({
      where: {
        providerId_providerType: {
          providerId: oldId,
          providerType: provider
        },
        userUid
      },
      data: {
        providerId: newId
      }
    });
    if (!oauthProvider) return null;
    return {
      oauthProvider
    };
  } catch (e) {
    return null;
  }
}

export const changeBindProviderSvc =
  (oldProviderId: string, newProviderId: string, providerType: ProviderType, userUid: string) =>
  async (res: NextApiResponse, next?: () => void) => {
    if (providerType === ProviderType.PASSWORD)
      return jsonRes(res, {
        code: 409,
        message: CHANGE_BIND_STATUS.NOT_SUPPORT
      });

    const user = await globalPrisma.user.findUnique({ where: { uid: userUid } });
    if (!user)
      return jsonRes(res, {
        code: 409,
        message: CHANGE_BIND_STATUS.USER_NOT_FOUND
      });
    if (newProviderId === oldProviderId)
      return jsonRes(res, {
        code: 200,
        message: CHANGE_BIND_STATUS.RESULT_SUCCESS
      });
    const result = await updateOauthProvider({
      provider: providerType,
      oldId: oldProviderId,
      newId: newProviderId,
      userUid
    });
    if (!result) throw Error(CHANGE_BIND_STATUS.DB_ERROR);
    else {
      jsonRes(res, {
        code: 200,
        message: CHANGE_BIND_STATUS.RESULT_SUCCESS
      });
      await Promise.resolve(next?.());
    }
  };

const bindProviderSvc =
  (providerId: string, providerType: ProviderType, userUid: string) =>
  async (res: NextApiResponse, next?: () => void) => {
    if (providerType === ProviderType.PASSWORD)
      return jsonRes(res, {
        code: 409,
        message: BIND_STATUS.NOT_SUPPORT
      });
    const user = await globalPrisma.user.findUnique({ where: { uid: userUid } });
    if (!user)
      return jsonRes(res, {
        code: 409,
        message: BIND_STATUS.USER_NOT_FOUND
      });
    const result = await addOauthProvider({
      providerType,
      providerId,
      userUid
    });
    if (!result) throw Error(BIND_STATUS.DB_ERROR);

    return jsonRes(res, {
      code: 200,
      message: BIND_STATUS.RESULT_SUCCESS
    });
  };
const unbindProviderSvc =
  (providerId: string, providerType: ProviderType, userUid: string) =>
  async (res: NextApiResponse, next?: () => void) => {
    if (providerType === ProviderType.PASSWORD)
      return jsonRes(res, {
        code: 409,
        message: UNBIND_STATUS.NOT_SUPPORT
      });
    const user = await findUser({ userUid });
    if (!user)
      return jsonRes(res, {
        code: 409,
        message: UNBIND_STATUS.USER_NOT_FOUND
      });
    if (
      !user.oauthProvider.find(
        (o) => o.providerType === providerType && o.providerId === providerId
      )
    )
      return jsonRes(res, {
        code: 409,
        message: PROVIDER_STATUS.PROVIDER_NOT_FOUND
      });
    if (providerType !== ProviderType.EMAIL) {
      // the number of provider must more than 1
      let minCount = 1;
      if (user.oauthProvider.find((o) => o.providerType === ProviderType.EMAIL)) {
        minCount++;
      }
      if (user.oauthProvider.length <= minCount)
        return jsonRes(res, {
          code: 409,
          message: UNBIND_STATUS.RESOURCE_CONFLICT
        });
    }

    const result = await removeOauthProvider({
      provider: providerType,
      id: providerId,
      userUid
    });
    if (!result) throw new Error(UNBIND_STATUS.DB_ERROR);
    return jsonRes(res, {
      code: 200,
      message: UNBIND_STATUS.RESULT_SUCCESS
    });
  };

export const bindPhoneSvc = (phoneNumbers: string, userUid: string) =>
  bindProviderSvc(phoneNumbers, ProviderType.PHONE, userUid);
export const bindGithubSvc = (id: string, userUid: string) =>
  bindProviderSvc(id, ProviderType.GITHUB, userUid);
export const bindWechatSvc = (id: string, userUid: string) =>
  bindProviderSvc(id, ProviderType.WECHAT, userUid);
export const bindGoogleSvc = (id: string, userUid: string) =>
  bindProviderSvc(id, ProviderType.GOOGLE, userUid);
export const bindEmailSvc = (email: string, userUid: string) =>
  bindProviderSvc(email, ProviderType.EMAIL, userUid);

export const unbindPhoneSvc = (phoneNumbers: string, userUid: string) =>
  unbindProviderSvc(phoneNumbers, ProviderType.PHONE, userUid);
export const unbindGithubSvc = (id: string, userUid: string) =>
  unbindProviderSvc(id, ProviderType.GITHUB, userUid);
export const unbindWechatSvc = (id: string, userUid: string) =>
  unbindProviderSvc(id, ProviderType.WECHAT, userUid);
export const unbindGoogleSvc = (id: string, userUid: string) =>
  unbindProviderSvc(id, ProviderType.GOOGLE, userUid);
export const unbindEmailSvc = (email: string, userUid: string) =>
  unbindProviderSvc(email, ProviderType.EMAIL, userUid);

export const changePhoneBindingSvc = (
  oldProviderId: string,
  newProviderId: string,
  userUid: string
) => changeBindProviderSvc(oldProviderId, newProviderId, ProviderType.PHONE, userUid);

export const changeEmailBindingSvc = (
  oldProviderId: string,
  newProviderId: string,
  userUid: string
) => changeBindProviderSvc(oldProviderId, newProviderId, ProviderType.EMAIL, userUid);
