import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '../response';
import { RESPONSE_MESSAGE } from '@/types/response/utils';
export const LICENSE_INACTIVE_CODE = 40301;
export const LICENSE_USER_LIMIT_EXCEEDED_CODE = 40302;

export const ErrorHandler =
  (handler: NextApiHandler, message: string = RESPONSE_MESSAGE.INTERNAL_SERVER_ERROR) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.log(error);
      if (isLicenseInactiveError(error)) {
        return jsonRes(res, { code: LICENSE_INACTIVE_CODE, message: 'LICENSE_INACTIVE' });
      }
      if (isLicenseUserLimitExceededError(error)) {
        return jsonRes(res, {
          code: LICENSE_USER_LIMIT_EXCEEDED_CODE,
          message: 'LICENSE_USER_LIMIT_EXCEEDED'
        });
      }
      jsonRes(res, {
        message,
        code: 500
      });
    }
  };

export function isLicenseError(err: unknown, code: number) {
  if (!err || typeof err !== 'object') return false;

  const body = (err as { body?: { message?: string }; message?: string }).body;
  const message = body?.message || (err as { message?: string }).message;

  return typeof message === 'string' && message.includes(String(code));
}

export const isLicenseInactiveError = (err: unknown) => isLicenseError(err, LICENSE_INACTIVE_CODE);
export const isLicenseUserLimitExceededError = (err: unknown) =>
  isLicenseError(err, LICENSE_USER_LIMIT_EXCEEDED_CODE);
