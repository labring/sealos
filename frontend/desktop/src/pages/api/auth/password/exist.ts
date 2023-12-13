import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';

import { queryUser } from '@/services/backend/db/user';
import { hashPassword } from '@/utils/crypto';
import { TUserExist } from '@/types/user';
import { enablePassword, enableSignUp } from '@/services/enable';
import { passwrodUserIsExist } from '@/services/backend/oauth';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    const { user } = req.body;
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
    const isExist = await passwrodUserIsExist({ username: user });
    if (!isExist)
      return jsonRes<TUserExist>(res, {
        message: 'user not found',
        code: 201,
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
