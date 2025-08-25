import { NextApiRequest, NextApiResponse } from 'next';
import { enableGithub } from '@/services/enable';
import { filterAccessToken } from '@/services/backend/middleware/access';
import {
  OauthCodeFilter,
  githubOAuthEnvFilter,
  githubOAuthGuard,
  unbindGithubGuard
} from '@/services/backend/middleware/oauth';
import { unbindGithubSvc } from '@/services/backend/svc/bindProvider';
import { ErrorHandler } from '@/services/backend/middleware/error';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableGithub()) {
    throw new Error('github clinet is not defined');
  }
  await filterAccessToken(req, res, async ({ userUid }) => {
    await OauthCodeFilter(req, res, async ({ code }) => {
      await githubOAuthEnvFilter()(async ({ clientID, clientSecret }) => {
        await githubOAuthGuard(
          clientID,
          clientSecret,
          code
        )(res, ({ id }) =>
          unbindGithubGuard(id, userUid)(res, () => unbindGithubSvc(id, userUid)(res))
        );
      });
    });
  });
});
