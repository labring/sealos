import { NextApiRequest, NextApiResponse } from 'next';
import { enableSms } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { filterPhoneVerifyParams, verifyPhoneCodeGuard } from '@/services/backend/middleware/sms';
import { unbindPhoneSvc } from '@/services/backend/svc/bindProvider';
import { ErrorHandler } from '@/services/backend/middleware/error';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(
    req,
    res,
    async ({ userUid }) =>
      await filterPhoneVerifyParams(req, res, async ({ phoneNumbers, code }) => {
        await verifyPhoneCodeGuard(phoneNumbers, code)(res, async ({ smsInfo: phoneInfo }) => {
          await unbindPhoneSvc(phoneInfo.id, userUid)(res);
        });
      })
  );
});
