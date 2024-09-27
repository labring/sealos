import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterPhoneVerifyParams, verifyPhoneCodeGuard } from '@/services/backend/middleware/sms';
import { unbindPhoneSvc } from '@/services/backend/svc/bindProvider';
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
        await verifyPhoneCodeGuard(phoneNumbers, code)(res, async ({ smsInfo: phoneInfo }) => {
          await unbindPhoneSvc(phoneInfo.id, userUid)(res);
        });
      })
  );
});
