import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import {
  filterCodeUid,
  filterPhoneParams,
  sendNewPhoneCodeGuard
} from '@/services/backend/middleware/sms';
import { sendPhoneCodeSvc } from '@/services/backend/svc/sms';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enablePhoneSms()) {
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
