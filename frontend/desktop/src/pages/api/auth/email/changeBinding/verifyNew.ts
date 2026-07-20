import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { bindEmailGuard, unbindEmailGuard } from '@/services/backend/middleware/oauth';
import {
  filterCodeUid,
  filterEmailVerifyParams,
  consumeFlowTicketGuard,
  verifyFlowTicketGuard,
  verifyCodeGuard
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
        verifyFlowTicketGuard(
          uid,
          userUid,
          'EMAIL'
        )(res, ({ ticket }) =>
          verifyCodeGuard(
            email,
            code,
            'email_change_new'
          )(res, ({ smsInfo: newEmailInfo }) =>
            consumeFlowTicketGuard(
              uid,
              userUid,
              'EMAIL'
            )(res, () =>
              unbindEmailGuard(ticket.oldProviderId, userUid)(res, () =>
                bindEmailGuard(newEmailInfo.id, userUid)(res, () =>
                  changeEmailBindingSvc(ticket.oldProviderId, newEmailInfo.id, userUid)(res)
                )
              )
            )
          )
        )
      )
    )
  );
});
