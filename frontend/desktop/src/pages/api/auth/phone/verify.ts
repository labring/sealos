import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterPhoneVerifyParams, verifyPhoneCodeGuard } from '@/services/backend/middleware/sms';
import { getGlobalTokenByPhoneSvc } from '@/services/backend/svc/access';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enablePhoneSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterPhoneVerifyParams(
    req,
    res,
    async ({ phoneNumbers, code, inviterId, semData, bdVid }) => {
      await verifyPhoneCodeGuard(phoneNumbers, code)(res, async ({ smsInfo: phoneInfo }) => {
        await getGlobalTokenByPhoneSvc(phoneInfo.id, inviterId, semData, bdVid)(res);
      });
    }
  );
});
