import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterEmailVerifyParams, verifyCodeGuard } from '@/services/backend/middleware/sms';
import { enableEmailSms } from '@/services/enable';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Verifies verification code for email alert binding.
 */
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEmailSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(
    req,
    res,
    async ({ userUid }) =>
      await filterEmailVerifyParams(req, res, async ({ email, code }) => {
        await verifyCodeGuard(
          email,
          code,
          'alert_bind_email'
        )(res, () => {
          jsonRes(res, {
            code: 200,
            message: 'Verification code verified successfully',
            data: { email }
          });
        });
      })
  );
});
