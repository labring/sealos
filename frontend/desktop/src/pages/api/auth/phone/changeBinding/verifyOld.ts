import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { unbindPhoneGuard } from '@/services/backend/middleware/oauth';
import { filterPhoneVerifyParams, verifyPhoneCodeGuard } from '@/services/backend/middleware/sms';
import { jsonRes } from '@/services/backend/response';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enablePhoneSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(
    req,
    res,
    async ({ userUid }) =>
      await filterPhoneVerifyParams(req, res, async ({ phoneNumbers, code }) => {
        await unbindPhoneGuard(phoneNumbers, userUid)(res, async () => {
          await verifyPhoneCodeGuard(phoneNumbers, code)(res, async ({ smsInfo: phoneInfo }) => {
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
