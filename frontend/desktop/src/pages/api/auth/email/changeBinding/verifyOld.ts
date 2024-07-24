import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { enableSms } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { filterEmailVerifyParams, verifyEmailCodeGuard } from '@/services/backend/middleware/sms';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { unbindEmailGuard } from '@/services/backend/middleware/oauth';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(
    req,
    res,
    async ({ userUid }) =>
      await filterEmailVerifyParams(req, res, async ({ email, code }) => {
        await unbindEmailGuard(email, userUid)(res, async () => {
          await verifyEmailCodeGuard(email, code)(res, async ({ smsInfo }) => {
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
