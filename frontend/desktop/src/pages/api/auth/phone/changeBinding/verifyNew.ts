import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { bindPhoneGuard, unbindPhoneGuard } from '@/services/backend/middleware/oauth';
import {
  filterCodeUid,
  filterPhoneVerifyParams,
  consumeFlowTicketGuard,
  verifyFlowTicketGuard,
  verifyCodeGuard
} from '@/services/backend/middleware/sms';
import { cnVersionMiddleware } from '@/services/backend/middleware/version';
import { changePhoneBindingSvc } from '@/services/backend/svc/bindProvider';
import { enablePhoneSms } from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await cnVersionMiddleware()(req, res, async () => {
    if (!enablePhoneSms()) {
      throw new Error('SMS is not enabled');
    }
    await filterAccessToken(
      req,
      res,
      async ({ userUid }) =>
        await filterPhoneVerifyParams(
          req,
          res,
          async ({ phoneNumbers, code, challengeId }) =>
            await filterCodeUid(
              req,
              res,
              async ({ uid }) =>
                await verifyFlowTicketGuard(
                  uid,
                  userUid,
                  'PHONE'
                )(res, async ({ ticket }) => {
                  await verifyCodeGuard(
                    phoneNumbers,
                    code,
                    'phone_change_new',
                    challengeId
                  )(res, async ({ smsInfo: newPhoneInfo }) => {
                    await consumeFlowTicketGuard(
                      uid,
                      userUid,
                      'PHONE'
                    )(res, () =>
                      unbindPhoneGuard(ticket.oldProviderId, userUid)(res, () =>
                        bindPhoneGuard(newPhoneInfo.id, userUid)(res, () =>
                          changePhoneBindingSvc(ticket.oldProviderId, newPhoneInfo.id, userUid)(res)
                        )
                      )
                    );
                  });
                })
            )
        )
    );
  });
});
