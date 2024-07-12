import { NextApiRequest, NextApiResponse } from 'next';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { enableEmailSms } from '@/services/enable';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterCf, filterEmailParams, sendEmailCodeGuard } from '@/services/backend/middleware/sms';
import { sendEmailCodeSvc } from '@/services/backend/svc/sms';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEmailSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterCf(req, res, async () => {
    await filterAccessToken(req, res, () =>
      filterEmailParams(req, res, ({ email }) =>
        sendEmailCodeGuard(email)(res, () => sendEmailCodeSvc(email)(res))
      )
    );
  });
});
