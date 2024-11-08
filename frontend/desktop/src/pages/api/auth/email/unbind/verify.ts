import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterEmailVerifyParams, verifyEmailCodeGuard } from '@/services/backend/middleware/sms';
import { unbindEmailSvc } from '@/services/backend/svc/bindProvider';
import { enableEmailSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEmailSms()) {
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
