import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterPhoneVerifyParams, verifyCodeGuard } from '@/services/backend/middleware/sms';
import { cnVersionMiddleware } from '@/services/backend/middleware/version';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';

/**
 * Verifies verification code for phone alert binding.
 */
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await cnVersionMiddleware()(req, res, async () => {
    if (!enablePhoneSms()) {
      throw new Error('SMS is not enabled');
    }
    await filterAccessToken(
      req,
      res,
      async ({ userUid }) =>
        await filterPhoneVerifyParams(req, res, async ({ phoneNumbers, code }) => {
          await verifyCodeGuard(
            phoneNumbers,
            code,
            'alert_bind_phone'
          )(res, () => {
            jsonRes(res, {
              code: 200,
              message: 'Verification code verified successfully',
              data: { phone: phoneNumbers }
            });
          });
        })
    );
  });
});
