import { NextApiRequest, NextApiResponse } from 'next';
import { enableGithub } from '@/services/enable';
import { persistImage } from '@/services/backend/persistImage';
import { ProviderType } from 'prisma/global/generated/client';
import {
  OauthCodeFilter,
  githubOAuthEnvFilter,
  githubOAuthGuard
} from '@/services/backend/middleware/oauth';
import { getGlobalTokenByGithubSvc } from '@/services/backend/svc/access';
import { ErrorHandler } from '@/services/backend/middleware/error';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableGithub()) {
    throw new Error('github clinet is not defined');
  }
  await OauthCodeFilter(req, res, async ({ code, inviterId }) => {
    await githubOAuthEnvFilter()(async ({ clientID, clientSecret }) => {
      await githubOAuthGuard(
        clientID,
        clientSecret,
        code
      )(res, async ({ id, name, avatar_url }) => {
        const persistUrl = await persistImage(
          avatar_url,
          'avatar/' + ProviderType.GITHUB + '/' + id
        );
        await getGlobalTokenByGithubSvc(persistUrl || '', id, name, inviterId)(res);
      });
    });
  });
});
