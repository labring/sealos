import { NextApiRequest, NextApiResponse } from 'next';
import { enableSms } from '@/services/enable';
import { filterPhoneVerifyParams, verifyPhoneCodeGuard } from '@/services/backend/middleware/sms';
import { getGlobalTokenByPhoneSvc } from '@/services/backend/svc/access';
import { ErrorHandler } from '@/services/backend/middleware/error';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterPhoneVerifyParams(req, res, async ({ phoneNumbers, code, inviterId }) => {
    await verifyPhoneCodeGuard(phoneNumbers, code)(res, async ({ smsInfo: phoneInfo }) => {
      await getGlobalTokenByPhoneSvc(phoneInfo.id, inviterId)(res);
    });
  });
});
