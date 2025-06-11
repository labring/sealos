import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { bindPhoneGuard, unbindPhoneGuard } from '@/services/backend/middleware/oauth';
import {
  filterCodeUid,
  filterPhoneVerifyParams,
  verifyCodeUidGuard,
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
          async ({ phoneNumbers, code }) =>
            await filterCodeUid(
              req,
              res,
              async ({ uid }) =>
                await verifyCodeUidGuard(uid)(res, async ({ smsInfo: oldPhoneInfo }) => {
                  await verifyCodeGuard(
                    phoneNumbers,
                    code,
                    'phone_change_new'
                  )(res, async ({ smsInfo: newPhoneInfo }) =>
                    unbindPhoneGuard(oldPhoneInfo.id, userUid)(res, () =>
                      bindPhoneGuard(newPhoneInfo.id, userUid)(res, () =>
                        changePhoneBindingSvc(oldPhoneInfo.id, newPhoneInfo.id, userUid)(res)
                      )
                    )
                  );
                })
            )
        )
    );
  });
});
