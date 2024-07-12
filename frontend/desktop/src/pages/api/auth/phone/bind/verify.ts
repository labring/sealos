import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { enableSms } from '@/services/enable';
import { filterPhoneVerifyParams, verifyPhoneCodeGuard } from '@/services/backend/middleware/sms';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { bindPhoneSvc } from '@/services/backend/svc/bindProvider';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { bindPhoneGuard } from '@/services/backend/middleware/oauth';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(
    req,
    res,
    async ({ userUid }) =>
      await filterPhoneVerifyParams(req, res, async ({ phoneNumbers, code }) => {
        await verifyPhoneCodeGuard(phoneNumbers, code)(res, () =>
          bindPhoneGuard(phoneNumbers, userUid)(res, () => bindPhoneSvc(phoneNumbers, userUid)(res))
        );
      })
  );
});
