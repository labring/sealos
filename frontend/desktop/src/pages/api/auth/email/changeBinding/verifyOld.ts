import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { unbindEmailGuard } from '@/services/backend/middleware/oauth';
import { filterEmailVerifyParams, verifyCodeGuard } from '@/services/backend/middleware/sms';
import { jsonRes } from '@/services/backend/response';
import { enableEmailSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEmailSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(
    req,
    res,
    async ({ userUid }) =>
      await filterEmailVerifyParams(req, res, async ({ email, code }) => {
        await unbindEmailGuard(email, userUid)(res, async () => {
          await verifyCodeGuard(
            email,
            code,
            'email_change_old'
          )(res, async ({ smsInfo }) => {
            return jsonRes(res, {
              code: 200,
              message: 'Successfully',
              data: {
                uid: smsInfo.uid
              }
            });
          });
        });
      })
  );
});
