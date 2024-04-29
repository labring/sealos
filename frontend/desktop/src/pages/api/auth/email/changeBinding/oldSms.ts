import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { enableSms } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { sendEmailCodeGuard, filterEmailParams } from '@/services/backend/middleware/sms';
import { sendEmailCodeSvc } from '@/services/backend/svc/sms';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { unbindEmailGuard } from '@/services/backend/middleware/oauth';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(req, res, ({ userUid }) =>
    filterEmailParams(req, res, ({ email }) =>
      unbindEmailGuard(email, userUid)(res, () =>
        sendEmailCodeGuard(email)(res, () => sendEmailCodeSvc(email)(res))
      )
    )
  );
});
