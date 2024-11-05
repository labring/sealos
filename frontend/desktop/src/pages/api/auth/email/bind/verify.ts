import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { bindEmailGuard } from '@/services/backend/middleware/oauth';
import { filterEmailVerifyParams, verifyEmailCodeGuard } from '@/services/backend/middleware/sms';
import { bindEmailSvc } from '@/services/backend/svc/bindProvider';
import { enableEmailSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEmailSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(
    req,
    res,
    async ({ userUid }) =>
      await filterEmailVerifyParams(req, res, async ({ email, code }) => {
        await verifyEmailCodeGuard(email, code)(res, () =>
          bindEmailGuard(email, userUid)(res, () => bindEmailSvc(email, userUid)(res))
        );
      })
  );
});
