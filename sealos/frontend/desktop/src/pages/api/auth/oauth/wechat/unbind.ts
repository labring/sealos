import { NextApiRequest, NextApiResponse } from 'next';
import { enableWechat } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import {
  OauthCodeFilter,
  unbindWechatGuard,
  wechatOAuthEnvFilter,
  wechatOAuthGuard
} from '@/services/backend/middleware/oauth';
import { unbindWechatSvc } from '@/services/backend/svc/bindProvider';
import { ErrorHandler } from '@/services/backend/middleware/error';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableWechat()) {
    throw new Error('github clinet is not defined');
  }
  await filterAccessToken(req, res, async ({ userUid }) => {
    await OauthCodeFilter(req, res, async ({ code }) => {
      await wechatOAuthEnvFilter()(async ({ clientID, clientSecret }) => {
        await wechatOAuthGuard(
          clientID,
          clientSecret,
          code
        )(res, ({ id }) =>
          unbindWechatGuard(id, userUid)(res, () => unbindWechatSvc(id, userUid)(res))
        );
      });
    });
  });
});
