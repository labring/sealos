import { NextApiRequest, NextApiResponse } from 'next';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { sendPhoneCodeGuard, filterPhoneParams, filterCf } from '@/services/backend/middleware/sms';
import { enableSms } from '@/services/enable';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { unbindPhoneGuard } from '@/services/backend/middleware/oauth';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(req, res, async ({ userUid }) => {
    await filterCf(req, res, async () => {
      await filterPhoneParams(
        req,
        res,
        async ({ phoneNumbers }) =>
          await unbindPhoneGuard(phoneNumbers, userUid)(
            res,
            async () =>
              await sendPhoneCodeGuard(phoneNumbers)(res, async () => {
                await sendPhoneCodeSvc(phoneNumbers)(res);
              })
          )
      );
    });
  });
});
