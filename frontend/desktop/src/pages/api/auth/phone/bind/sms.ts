import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { sendPhoneCodeGuard, filterPhoneParams, filterCf } from '@/services/backend/middleware/sms';
import { enableSms } from '@/services/enable';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { bindPhoneGuard } from '@/services/backend/middleware/oauth';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterCf(req, res, async () => {
    await filterAccessToken(
      req,
      res,
      async ({ userUid }) =>
        await filterPhoneParams(req, res, ({ phoneNumbers: phone }) =>
          sendPhoneCodeGuard(phone)(res, () => sendPhoneCodeSvc(phone))
        )
    );
  });
});
