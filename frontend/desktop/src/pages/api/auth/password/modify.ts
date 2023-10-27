import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { Session } from '@/types/session';
import { hashPassword, strongPassword, verifyPassword } from '@/utils/crypto';
import { enablePassword } from '@/services/enable';
import { authSession } from '@/services/backend/auth';
import { queryUser, updateUser } from '@/services/backend/db/user';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const uid = payload.user.uid;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword) return jsonRes(res, { code: 400, message: 'oldPassword is required' });
    if (!newPassword) return jsonRes(res, { code: 400, message: 'newPassword is required' });
    const _user = await queryUser({ id: uid, provider: 'uid' });
    if (!_user) return jsonRes(res, { code: 404, message: 'user is not founded' });
    if (!_user.password) {
      return jsonRes(res, { code: 409, message: 'Please login by password' });
    }
    if (
      !oldPassword ||
      !verifyPassword(oldPassword, _user.password) ||
      oldPassword === newPassword
    ) {
      return jsonRes(res, { code: 409, message: 'password error' });
    }
    if (!strongPassword(newPassword)) {
      return jsonRes(res, {
        message:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character',
        code: 400
      });
    }
    const updateRes = await updateUser({
      id: uid,
      provider: 'uid',
      data: { password: hashPassword(newPassword) }
    });
    if (!updateRes.acknowledged) throw new Error('modify password error');
    console.log(
      'modify',
      updateRes,
      oldPassword,
      newPassword,
      'hash',
      hashPassword(oldPassword),
      hashPassword(newPassword)
    );
    return jsonRes<Session>(res, {
      code: 200,
      message: 'Successfully!'
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to authenticate with password',
      code: 500
    });
  }
}
