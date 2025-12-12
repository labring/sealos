import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterPhoneParams, sendSmsCodeGuard } from '@/services/backend/middleware/sms';
import { cnVersionMiddleware } from '@/services/backend/middleware/version';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Sends verification code for phone alert binding.
 */
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await cnVersionMiddleware()(req, res, async () => {
    if (!enablePhoneSms()) {
      throw new Error('SMS is not enabled');
    }
    await filterAccessToken(req, res, () =>
      filterPhoneParams(req, res, ({ phoneNumbers: phone }) =>
        sendSmsCodeGuard({
          id: phone,
          smsType: 'alert_bind_phone'
        })(req, res, () => sendPhoneCodeSvc(phone, 'alert_bind_phone')(res))
      )
    );
  });
});
