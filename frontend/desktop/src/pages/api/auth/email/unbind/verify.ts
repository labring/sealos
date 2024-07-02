import { NextApiRequest, NextApiResponse } from 'next';
import { enableSms } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { verifyEmailCodeGuard, filterEmailVerifyParams } from '@/services/backend/middleware/sms';
import { unbindEmailSvc } from '@/services/backend/svc/bindProvider';
import { ErrorHandler } from '@/services/backend/middleware/error';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(req, res, ({ userUid }) =>
    filterEmailVerifyParams(req, res, async ({ email, code }) =>
      verifyEmailCodeGuard(email, code)(res, async ({ smsInfo }) =>
        unbindEmailSvc(smsInfo.id, userUid)(res)
      )
    )
  );
});
