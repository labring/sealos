import { NextApiRequest, NextApiResponse } from 'next';
import { enableGithub, enableGoogle } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import {
  OauthCodeFilter,
  googleOAuthEnvFilter,
  googleOAuthGuard,
  unbindGoogleGuard
} from '@/services/backend/middleware/oauth';
import { unbindGoogleSvc } from '@/services/backend/svc/bindProvider';
import { ErrorHandler } from '@/services/backend/middleware/error';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableGoogle()) {
    throw new Error('google svc is not defined');
  }
  await filterAccessToken(req, res, async ({ userUid }) => {
    await OauthCodeFilter(req, res, async ({ code }) => {
      await googleOAuthEnvFilter()(async ({ clientID, clientSecret, callbackURL }) => {
        await googleOAuthGuard(
          clientID,
          clientSecret,
          code,
          callbackURL
        )(res, ({ name, id, avatar_url }) =>
          unbindGoogleGuard(id, userUid)(res, () => unbindGoogleSvc(id, userUid)(res))
        );
      });
    });
  });
});
