import { NextApiRequest, NextApiResponse } from 'next';
import { enableEmailSms } from '@/services/enable';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterCf, filterEmailParams, sendSmsCodeGuard } from '@/services/backend/middleware/sms';
import { sendEmailCodeSvc } from '@/services/backend/svc/sms';
import { cnVersionMiddleware, enVersionMiddleware } from '@/services/backend/middleware/version';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await enVersionMiddleware()(req, res, async () => {
    if (!enableEmailSms()) {
      throw new Error('SMS is not enabled');
    }
    await filterCf(req, res, async () => {
      filterEmailParams(req, res, ({ email }) =>
        sendSmsCodeGuard({
          id: email,
          smsType: 'email_login'
        })(req, res, () => sendEmailCodeSvc(email, 'email_login')(res))
      );
    });
  });
});
