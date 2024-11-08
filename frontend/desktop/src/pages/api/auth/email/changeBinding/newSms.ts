import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import {
  filterCodeUid,
  filterEmailParams,
  sendNewEmailCodeGuard
} from '@/services/backend/middleware/sms';
import { sendEmailCodeSvc } from '@/services/backend/svc/sms';
import { enableEmailSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEmailSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(req, res, ({ userUid }) =>
    filterEmailParams(req, res, ({ email }) =>
      filterCodeUid(req, res, ({ uid }) =>
        sendNewEmailCodeGuard(uid, email)(res, () => sendEmailCodeSvc(email)(res))
      )
    )
  );
});
