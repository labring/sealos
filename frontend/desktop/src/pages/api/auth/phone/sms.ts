import { NextApiRequest, NextApiResponse } from 'next';
import { enableSms } from '@/services/enable';
import { filterCf, filterPhoneParams, sendPhoneCodeGuard } from '@/services/backend/middleware/sms';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
import { ErrorHandler } from '@/services/backend/middleware/error';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterCf(req, res, async () => {
    await filterPhoneParams(req, res, ({ phoneNumbers: phone }) =>
      sendPhoneCodeGuard(phone)(res, () => sendPhoneCodeSvc(phone)(res))
    );
  });
});
