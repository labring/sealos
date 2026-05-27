import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { strongPassword } from '@/utils/crypto';
import { enablePassword } from '@/services/enable';
import { getGlobalToken } from '@/services/backend/globalAuth';
import { AuthError } from '@/services/backend/errors';
import { ProviderType } from 'prisma/global/generated/client';
import { initRegionToken } from '@/services/backend/regionAuth';
import { getRegionUid } from '@/services/enable';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    const { user: name, password, inviterId, semData, adClickData } = req.body;
    if (!strongPassword(password)) {
      return jsonRes(res, {
        message:
          'Password must be at least 8 characters long and contain at least one non-whitespace character',
        code: 400
      });
    }
    const data = await getGlobalToken({
      provider: ProviderType.PASSWORD,
      providerId: name,
      avatar_url: '',
      password,
      name,
      inviterId,
      semData,
      adClickData
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

    // Auto init region for new users so callers can directly use regionToken API
    if (data.needInit && data.user) {
      const regionUid = getRegionUid();
      console.log('password auth: auto init workspace start', {
        providerId: name,
        userUid: data.user.userUid,
        userId: data.user.userId,
        regionUid
      });
      try {
        const regionData = await initRegionToken({
          userUid: data.user.userUid,
          userId: data.user.userId,
          regionUid,
          workspaceName: 'My Workspace'
        });
        if (!regionData) {
          console.error('password auth: auto init workspace returned empty result', {
            providerId: name,
            userUid: data.user.userUid,
            userId: data.user.userId,
            regionUid
          });
          return jsonRes(res, {
            data: {
              token: data.token,
              needInit: true
            },
            code: 409,
            message: 'Failed to init workspace'
          });
        }
      } catch (e) {
        console.error('password auth: auto init workspace failed', {
          providerId: name,
          userUid: data.user.userUid,
          userId: data.user.userId,
          regionUid,
          error: e
        });
        return jsonRes(res, {
          data: {
            token: data.token,
            needInit: true
          },
          code: 409,
          message: 'Failed to init workspace'
        });
      }
    }

    return jsonRes(res, {
      data: {
        token: data.token,
        needInit: false
      },
      code: 200,
      message: 'Successfully'
    });
  } catch (err) {
    console.log(err);
    let message = 'Failed to authorize with password';

    if (err instanceof AuthError) {
      message = err.message;
    } else if (err instanceof Error) {
      message = err.message;
    }

    return jsonRes(res, {
      message,
      code: 500
    });
  }
}
