import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { bindEmailGuard } from '@/services/backend/middleware/oauth';
import { filterEmailVerifyParams, verifyCodeGuard } from '@/services/backend/middleware/sms';
import { cnVersionMiddleware, enVersionMiddleware } from '@/services/backend/middleware/version';
import { getGlobalTokenSvc } from '@/services/backend/svc/access';
import { bindEmailSvc } from '@/services/backend/svc/bindProvider';
import { enableEmailSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await enVersionMiddleware()(req, res, async () => {
    if (!enableEmailSms()) {
      throw new Error('SMS is not enabled');
    }
    await filterEmailVerifyParams(req, res, async ({ email, code }) => {
      await verifyCodeGuard(
        email,
        code,
        'email_login'
      )(
        res,
        async () =>
          await getGlobalTokenSvc({
            avatar_url: '',
            providerId: email,
            name: email,
            providerType: 'EMAIL'
          })(req, res)
      );
    });
  });
});
