import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { strongPassword } from '@/utils/crypto';
import { enablePassword } from '@/services/enable';
import { getGlobalToken } from '@/services/backend/globalAuth';
import { AuthError } from '@/services/backend/errors';
import { ProviderType } from 'prisma/global/generated/client';
import { normalizePasswordUsername } from '@/services/backend/passwordUsername';
import { getSafeAuthErrorInfo, withAuthStage } from '@/services/backend/authDiagnostics';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    const { user: rawName, password, inviterId, semData, adClickData } = req.body;
    const normalizedUsername = normalizePasswordUsername(rawName);
    if (normalizedUsername.isEmpty || normalizedUsername.hasUnsafeCharacters) {
      return jsonRes(res, {
        message: 'Invalid username.',
        code: 400
      });
    }
    const name = normalizedUsername.value;

    if (!strongPassword(password)) {
      return jsonRes(res, {
        message:
          'Password must be at least 8 characters long and contain at least one non-whitespace character',
        code: 400
      });
    }
    const data = await withAuthStage(
      'password.authorize',
      {
        provider: ProviderType.PASSWORD,
        usernameChanged: normalizedUsername.changed,
        adminLike: normalizedUsername.isAdminLike
      },
      () =>
        getGlobalToken({
          provider: ProviderType.PASSWORD,
          providerId: typeof rawName === 'string' ? rawName : name,
          avatar_url: '',
          password,
          name,
          inviterId,
          semData,
          adClickData
        })
    );

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

    return jsonRes(res, {
      data: {
        token: data.token,
        needInit: data.needInit
      },
      code: 200,
      message: 'Successfully'
    });
  } catch (err) {
    console.error('password auth failed:', getSafeAuthErrorInfo(err));

    if (err instanceof AuthError) {
      if (err.errorCode === 'INVALID_USERNAME') {
        return jsonRes(res, {
          message: 'Invalid username.',
          code: 400
        });
      }
      if (err.errorCode === 'USER_NOT_FOUND' || err.errorCode === 'INCORRECT_PASSWORD') {
        return jsonRes(res, {
          message: 'Unauthorized',
          code: 401
        });
      }
    }

    return jsonRes(res, {
      message: 'Failed to authorize with password',
      code: 500
    });
  }
}
