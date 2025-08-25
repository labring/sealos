import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { ApiSession } from '@/types/session';
import { enablePassword, enableApi, enableSignUp } from '@/services/enable';
import { strongPassword } from '@/utils/crypto';
import { globalPrisma } from '@/services/backend/db/init';
import { signUpByPassword } from '@/services/backend/globalAuth';
import { getRegionToken } from '@/services/backend/regionAuth';
import { verifyJWT } from '@/services/backend/auth';
import { ProviderType } from 'prisma/global/generated/client';
import { AccessTokenPayload } from '@/types/token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    if (!enableSignUp()) throw new Error('Failed to sign up user');
    if (!enableApi()) throw new Error('Failed to sign up by api');
    const { password, username } = req.body as Record<string, string>;
    if (!password) return jsonRes(res, { code: 400, message: 'password is Required' });
    if (!username) return jsonRes(res, { code: 400, message: 'username is Required' });

    if (!strongPassword(password)) {
      return jsonRes(res, {
        message:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character',
        code: 400
      });
    }
    const _user = await globalPrisma.oauthProvider.findUnique({
      where: {
        providerId_providerType: {
          providerType: ProviderType.PASSWORD,
          providerId: username
        }
      }
    });
    if (!!_user)
      return jsonRes(res, {
        message: 'User is already exist',
        code: 409
      });
    const globalData = await signUpByPassword({
      id: username,
      password,
      avatar_url: '',
      name: username
    });
    if (!globalData) throw new Error('Failed to edit db');
    const realUser = globalData.user;
    const data = await getRegionToken({ userUid: realUser.uid, userId: realUser.nickname });
    if (!data)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    const regionUser = (await verifyJWT<AccessTokenPayload>(data.token))!;
    return jsonRes<ApiSession>(res, {
      data: {
        user: {
          name: realUser.nickname,
          kubernetesUsername: regionUser.userCrName,
          avatar: realUser.avatarUri,
          nsID: regionUser.workspaceId,
          nsUID: regionUser.workspaceUid,
          userID: regionUser.userCrUid
        },
        kubeconfig: data.kubeconfig
      },
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
