import { NextApiRequest, NextApiResponse } from 'next';
import { enableSms } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { sendPhoneCodeGuard, filterPhoneParams } from '@/services/backend/middleware/sms';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { unbindPhoneGuard } from '@/services/backend/middleware/oauth';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(
    req,
    res,
    async ({ userUid }) =>
      await filterPhoneParams(req, res, async ({ phoneNumbers }) => {
        await unbindPhoneGuard(phoneNumbers, userUid)(res, () =>
          sendPhoneCodeGuard(phoneNumbers)(res, async () => sendPhoneCodeSvc(phoneNumbers)(res))
        );
      })
  );
});
