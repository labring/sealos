import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { bindEmailGuard, unbindEmailGuard } from '@/services/backend/middleware/oauth';
import {
  filterCodeUid,
  filterEmailVerifyParams,
  verifyCodeUidGuard,
  verifyEmailCodeGuard
} from '@/services/backend/middleware/sms';
import { changeEmailBindingSvc } from '@/services/backend/svc/bindProvider';
import { enableEmailSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEmailSms()) {
    throw new Error('SMS is not enabled');
  }
  await filterAccessToken(req, res, ({ userUid }) =>
    filterEmailVerifyParams(req, res, ({ email, code }) =>
      filterCodeUid(req, res, ({ uid }) =>
        verifyCodeUidGuard(uid)(res, ({ smsInfo: oldEmailInfo }) =>
          verifyEmailCodeGuard(email, code)(res, ({ smsInfo: newEmailInfo }) =>
            unbindEmailGuard(oldEmailInfo.id, userUid)(res, () =>
              bindEmailGuard(newEmailInfo.id, userUid)(res, () =>
                changeEmailBindingSvc(oldEmailInfo.id, newEmailInfo.id, userUid)(res)
              )
            )
          )
        )
      )
    )
  );
});
