import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import {
  filterCodeUid,
  filterPhoneParams,
  sendNewSmsCodeGuard
} from '@/services/backend/middleware/sms';
import { cnVersionMiddleware } from '@/services/backend/middleware/version';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await cnVersionMiddleware()(req, res, async () => {
    if (!enablePhoneSms()) {
      throw new Error('SMS is not enabled');
    }
    await filterAccessToken(req, res, ({ userUid }) =>
      filterPhoneParams(req, res, ({ phoneNumbers }) =>
        filterCodeUid(req, res, ({ uid }) =>
          sendNewSmsCodeGuard({
            codeUid: uid,
            smsId: phoneNumbers,
            smsType: 'phone_change_new'
          })(req, res, () => sendPhoneCodeSvc(phoneNumbers, 'phone_change_new')(res))
        )
      )
    );
  });
});
