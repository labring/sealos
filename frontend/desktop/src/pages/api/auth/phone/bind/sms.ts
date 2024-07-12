import { NextApiRequest, NextApiResponse } from 'next';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { sendPhoneCodeGuard, filterPhoneParams, filterCf } from '@/services/backend/middleware/sms';
import { enableSms } from '@/services/enable';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterCf(req, res, async () => {
    console.log('filiterAccess');
    await filterAccessToken(req, res, () =>
      filterPhoneParams(req, res, ({ phoneNumbers: phone }) =>
        sendPhoneCodeGuard(phone)(res, () => sendPhoneCodeSvc(phone)(res))
      )
    );
  });
});
