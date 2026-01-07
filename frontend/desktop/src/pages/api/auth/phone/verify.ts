import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterPhoneVerifyParams, verifyCodeGuard } from '@/services/backend/middleware/sms';
import { cnVersionMiddleware } from '@/services/backend/middleware/version';
import { getGlobalTokenSvc } from '@/services/backend/svc/access';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await cnVersionMiddleware()(req, res, async () => {
    if (!enablePhoneSms()) {
      throw new Error('SMS is not enabled');
    }
    await filterPhoneVerifyParams(
      req,
      res,
      async ({ phoneNumbers, code, semData, adClickData }) => {
        await verifyCodeGuard(
          phoneNumbers,
          code,
          'phone_login'
        )(res, async ({ smsInfo: phoneInfo }) => {
          await getGlobalTokenSvc({
            avatar_url: '',
            providerId: phoneInfo.id,
            name: phoneInfo.id,
            semData,
            adClickData,
            providerType: 'PHONE'
          })(req, res);
        });
      }
    );
  });
});
