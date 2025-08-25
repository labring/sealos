import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { hashPassword, strongPassword, verifyPassword } from '@/utils/crypto';
import { enablePassword } from '@/services/enable';
import { findUser, signInByPassword, updatePassword } from '@/services/backend/globalAuth';
import { ProviderType } from 'prisma/global/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    // const payload = await verifyToken<RealUserTokenPayload>(req.headers)
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword) return jsonRes(res, { code: 400, message: 'oldPassword is required' });
    if (!newPassword) return jsonRes(res, { code: 400, message: 'newPassword is required' });
    const user = await findUser({ userUid: payload.userUid });
    const passwordProvider = user?.oauthProvider.find(
      (val) => val.providerType === ProviderType.PASSWORD
    );

    if (!passwordProvider) return jsonRes(res, { code: 404, message: 'user is not founded' });
    const signIn = await signInByPassword({
      id: passwordProvider.providerId,
      password: oldPassword
    });
    if (!signIn) return jsonRes(res, { code: 409, message: 'user is not founded' });
    if (!strongPassword(newPassword)) {
      return jsonRes(res, {
        message: 'Password must be at least 8 characters long',
        code: 400
      });
    }
    const updateRes = await updatePassword({
      id: passwordProvider.providerId,
      password: hashPassword(newPassword)
    });
    if (!updateRes) throw new Error('modify password error');
    return jsonRes(res, {
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
