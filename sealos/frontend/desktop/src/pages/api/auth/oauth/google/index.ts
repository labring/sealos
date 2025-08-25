import { NextApiRequest, NextApiResponse } from 'next';
import { enableGoogle } from '@/services/enable';
import { persistImage } from '@/services/backend/persistImage';
import { ProviderType } from 'prisma/global/generated/client';
import {
  googleOAuthEnvFilter,
  googleOAuthGuard,
  OauthCodeFilter
} from '@/services/backend/middleware/oauth';
import { getGlobalTokenSvc } from '@/services/backend/svc/access';
import { ErrorHandler } from '@/services/backend/middleware/error';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableGoogle()) throw new Error('google clinet is not defined');
  await OauthCodeFilter(
    req,
    res,
    async ({ code, inviterId, semData, adClickData }) =>
      await googleOAuthEnvFilter()(async ({ clientID, clientSecret, callbackURL }) => {
        await googleOAuthGuard(
          clientID,
          clientSecret,
          code,
          callbackURL
        )(res, async ({ id, name, avatar_url, email }) => {
          const presistAvatarUrl =
            (await persistImage(avatar_url, 'avatar/' + ProviderType.GOOGLE + '/' + id)) || '';
          // await getGlobalTokenByGoogleSvc(
          //   presistAvatarUrl,
          //   id,
          //   name,
          //   email,
          //   inviterId,
          //   semData,
          //   bdVid
          // )(res);
          await getGlobalTokenSvc({
            avatar_url: presistAvatarUrl || '',
            providerId: id,
            name,
            email,
            inviterId,
            semData,
            adClickData,
            providerType: 'GOOGLE'
          })(req, res);
        });
      })
  );
});
