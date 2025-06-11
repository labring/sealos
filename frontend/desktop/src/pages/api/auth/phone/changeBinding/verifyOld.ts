import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { unbindPhoneGuard } from '@/services/backend/middleware/oauth';
import { filterPhoneVerifyParams, verifyCodeGuard } from '@/services/backend/middleware/sms';
import { cnVersionMiddleware } from '@/services/backend/middleware/version';
import { jsonRes } from '@/services/backend/response';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

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
          await unbindPhoneGuard(phoneNumbers, userUid)(res, async () => {
            await verifyCodeGuard(
              phoneNumbers,
              code,
              'phone_change_old'
            )(res, async ({ smsInfo: phoneInfo }) => {
              return jsonRes(res, {
                code: 200,
                message: 'Successfully',
                data: {
                  uid: phoneInfo.uid
                }
              });
            });
          });
        })
    );
  });
});
