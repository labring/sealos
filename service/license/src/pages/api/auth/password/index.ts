import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { Session } from '@/types/session';
import { getOauthRes } from '@/services/backend/oauth';
import { strongPassword } from '@/utils/crypto';
import { enablePassword } from '@/services/enable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    const { user: name, password } = req.body;
    if (!strongPassword(password)) {
      return jsonRes(res, {
        message:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character',
        code: 400
      });
    }
    const data = await getOauthRes({
      provider: 'password_user',
      id: '' + name,
      name,
      avatar_url: '',
      password
    });
    return jsonRes<Session>(res, {
      data,
      code: 200,
      message: 'Successfully'
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to authenticate with password',
      code: 500
    });
  }
}
