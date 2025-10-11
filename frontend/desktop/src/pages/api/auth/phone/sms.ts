import { ErrorHandler } from '@/services/backend/middleware/error';
import {
  filterCaptcha,
  filterPhoneParams,
  sendSmsCodeGuard
} from '@/services/backend/middleware/sms';
import { cnVersionMiddleware } from '@/services/backend/middleware/version';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await cnVersionMiddleware()(req, res, async () => {
    if (!enablePhoneSms()) {
      throw new Error('SMS is not enabled');
    }
    await filterCaptcha(req, res, async () =>
      filterPhoneParams(req, res, async ({ phoneNumbers: phone }) =>
        sendSmsCodeGuard({
          id: phone,
          smsType: 'phone_login'
        })(req, res, async () => await sendPhoneCodeSvc(phone, 'phone_login')(res))
      )
    );
  });
});
