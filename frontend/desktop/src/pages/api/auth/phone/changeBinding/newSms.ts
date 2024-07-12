import { NextApiRequest, NextApiResponse } from 'next';
import { enableSms } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import {
  filterPhoneParams,
  filterCodeUid,
  sendNewPhoneCodeGuard
} from '@/services/backend/middleware/sms';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(req, res, ({ userUid }) =>
    filterPhoneParams(req, res, ({ phoneNumbers }) =>
      filterCodeUid(req, res, ({ uid }) =>
        sendNewPhoneCodeGuard(uid, phoneNumbers)(res, () => sendPhoneCodeSvc(phoneNumbers)(res))
      )
    )
  );
});
