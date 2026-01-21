import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '../response';
import { RESPONSE_MESSAGE } from '@/types/response/utils';
export const LICENSE_INACTIVE_CODE = 40301;

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
      jsonRes(res, {
        message,
        code: 500
      });
    }
  };

export function isLicenseInactiveError(err: unknown) {
  if (!err || typeof err !== 'object') return false;

  const body = (err as { body?: { message?: string }; message?: string }).body;
  const message = body?.message || (err as { message?: string }).message;

  return typeof message === 'string' && message.includes(String(LICENSE_INACTIVE_CODE));
}
