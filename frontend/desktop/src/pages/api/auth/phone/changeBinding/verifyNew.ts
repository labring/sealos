import next, { NextApiRequest, NextApiResponse } from 'next';
import { enableSms } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import {
  verifyCodeUidGuard,
  filterCodeUid,
  filterPhoneVerifyParams,
  verifyPhoneCodeGuard
} from '@/services/backend/middleware/sms';
import { changePhoneBindingSvc } from '@/services/backend/svc/bindProvider';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { bindPhoneGuard, unbindPhoneGuard } from '@/services/backend/middleware/oauth';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableSms()) {
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
                await verifyPhoneCodeGuard(phoneNumbers, code)(
                  res,
                  async ({ smsInfo: newPhoneInfo }) =>
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
