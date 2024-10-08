import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterCf, filterPhoneParams, sendPhoneCodeGuard } from '@/services/backend/middleware/sms';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enablePhoneSms()) {
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
