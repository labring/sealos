import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { unbindPhoneGuard } from '@/services/backend/middleware/oauth';
import { filterCf, filterPhoneParams, sendPhoneCodeGuard } from '@/services/backend/middleware/sms';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enablePhoneSms()) {
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
