import { NextApiRequest, NextApiResponse } from 'next';
import { enableSms } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import {
  verifyCodeUidGuard,
  filterEmailParams,
  sendEmailCodeGuard,
  filterCodeUid,
  sendNewEmailCodeGuard
} from '@/services/backend/middleware/sms';
import { sendEmailCodeSvc } from '@/services/backend/svc/sms';
import { ErrorHandler } from '@/services/backend/middleware/error';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
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
