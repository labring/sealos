import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { ApiSession } from '@/types/session';
import { enableApi, enablePassword } from '@/services/enable';
import { signInByPassword } from '@/services/backend/globalAuth';
import { getRegionToken } from '@/services/backend/regionAuth';
import { verifyAccessToken, verifyJWT } from '@/services/backend/auth';
import { AccessTokenPayload } from '@/types/token';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    if (!enableApi()) throw new Error('Failed to sign in by api');
    const { password, username } = req.body as Record<string, string>;
    if (!password) return jsonRes(res, { code: 400, message: 'password is Required' });
    if (!username) return jsonRes(res, { code: 400, message: 'username is Required' });

    const _data = await signInByPassword({
      id: username,
      password
    });
    if (!_data)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    const data = await getRegionToken({
      userUid: _data.user.uid,
      userId: _data.user.name
    });
    if (!data)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    const regionUser = (await verifyJWT<AccessTokenPayload>(data.token))!;

    return jsonRes<ApiSession>(res, {
      data: {
        user: {
          name: _data.user.nickname,
          kubernetesUsername: regionUser.userCrName,
          avatar: _data.user.avatarUri,
          nsID: regionUser.workspaceId,
          nsUID: regionUser.workspaceUid,
          userID: regionUser.userCrName
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
