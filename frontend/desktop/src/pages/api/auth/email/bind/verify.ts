import { NextApiRequest, NextApiResponse } from 'next';
import { enableSms } from '@/services/enable';
import { verifyEmailCodeGuard, filterEmailVerifyParams } from '@/services/backend/middleware/sms';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { bindEmailSvc, bindPhoneSvc } from '@/services/backend/svc/bindProvider';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { bindEmailGuard, bindPhoneGuard } from '@/services/backend/middleware/oauth';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
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
