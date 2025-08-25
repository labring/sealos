import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { unbindEmailGuard } from '@/services/backend/middleware/oauth';
import { filterEmailParams, sendSmsCodeGuard } from '@/services/backend/middleware/sms';
import { sendEmailCodeSvc } from '@/services/backend/svc/sms';
import { enableEmailSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEmailSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(req, res, ({ userUid }) =>
    filterEmailParams(req, res, ({ email }) =>
      unbindEmailGuard(email, userUid)(res, () =>
        sendSmsCodeGuard({
          id: email,
          smsType: 'email_change_old'
        })(req, res, () => sendEmailCodeSvc(email, 'email_change_old')(res))
      )
    )
  );
});
