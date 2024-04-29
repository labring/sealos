import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { TUserExist } from '@/types/user';
import { enablePassword, enableSignUp } from '@/services/enable';
import { globalPrisma } from '@/services/backend/db/init';
import { ProviderType } from 'prisma/global/generated/client';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    const { user } = req.body as { user: string };
    if (!enableSignUp()) {
      return jsonRes<TUserExist>(res, {
        code: 200,
        message: 'Successfully',
        data: {
          user,
          exist: true
        }
      });
    }
    const isExist = await globalPrisma.oauthProvider.findUnique({
      where: {
        providerId_providerType: {
          providerType: ProviderType.PASSWORD,
          providerId: user
        }
      }
    });
    if (!isExist)
      return jsonRes(res, {
        code: 201,
        message: 'user is not founded',
        data: {
          user,
          exist: false
        }
      });
    else
      return jsonRes<TUserExist>(res, {
        code: 200,
        message: 'Successfully',
        data: {
          user,
          exist: true
        }
      });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to get result',
      code: 500
    });
  }
}
