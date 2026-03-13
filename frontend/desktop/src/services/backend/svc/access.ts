import { SemData } from '@/types/sem';
import { NextApiResponse } from 'next';
import { ProviderType, UserStatus } from 'prisma/global/generated/client';
import { globalPrisma } from '../db/init';
import { getGlobalToken } from '../globalAuth';
import { jsonRes } from '../response';
import { createMiddleware } from '@/utils/factory';
import { AdClickData } from '@/types/adClick';
type AuthContext = {
  avatar_url: string;
  providerId: string;
  name: string;
  providerType: ProviderType;
  email?: string;
  password?: string;
  semData?: SemData;
  adClickData?: AdClickData;
};
export const getGlobalTokenSvc = createMiddleware<AuthContext, unknown>(
  async ({ req, res, next, ctx }) => {
    const data = await getGlobalToken({
      provider: ctx.providerType,
      providerId: ctx.providerId,
      avatar_url: ctx.avatar_url,
      name: ctx.name,
      email: ctx.email,
      password: ctx.password,
      semData: ctx.semData,
      adClickData: ctx.adClickData
    });

    if (data?.isRestricted) {
      return jsonRes(res, {
        code: 401,
        message: 'Account banned'
      });
    }

    if (!data)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });

    if (data.error) {
      return jsonRes(res, {
        code: 40000,
        data,
        message: 'Unauthorized'
      });
    }

    return jsonRes(res, {
      data,
      code: 200,
      message: 'Successfully'
    });
  }
);

export const checkUserStatusSvc = createMiddleware<{ userUid: string }>(
  async ({ req, res, next, ctx }) => {
    const { userUid } = ctx;
    const user = await globalPrisma.user.findUnique({
      where: {
        uid: userUid,
        status: UserStatus.NORMAL_USER
      }
    });
    if (!user)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
    next?.();
  }
);
