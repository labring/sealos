import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterCf, filterPhoneParams, sendSmsCodeGuard } from '@/services/backend/middleware/sms';
import { cnVersionMiddleware } from '@/services/backend/middleware/version';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await cnVersionMiddleware()(req, res, async () => {
    if (!enablePhoneSms()) {
      throw new Error('SMS is not enabled');
    }
    await filterCf(req, res, async () => {
      await filterAccessToken(req, res, () =>
        filterPhoneParams(req, res, ({ phoneNumbers: phone }) =>
          sendSmsCodeGuard({
            id: phone,
            smsType: 'phone_bind'
          })(req, res, () => sendPhoneCodeSvc(phone, 'phone_bind')(res))
        )
      );
    });
  });
});
