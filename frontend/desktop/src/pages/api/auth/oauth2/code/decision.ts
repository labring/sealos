import { NextApiRequest, NextApiResponse } from 'next';
import { decideCodeAuthorization } from '@/services/backend/oauth2/authorization-code';
import {
  codeBrowserUser,
  codeParameters,
  codeResponse,
  limitCodeHttp
} from '@/services/backend/oauth2/code-http';
import { OAuth2HttpError } from '@/services/backend/oauth2/errors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return codeResponse(res, async () => {
    if (req.method !== 'POST') return res.status(405).end();
    await limitCodeHttp(req);
    const params = codeParameters(req.body);
    if (!['approve', 'deny'].includes(params.decision))
      throw new OAuth2HttpError(400, 'invalid_request');
    const auth = await codeBrowserUser(req, params);
    return res
      .status(200)
      .json(
        await decideCodeAuthorization(
          params.request_id,
          auth.secret,
          auth.userUid,
          params.decision === 'approve'
        )
      );
  });
}
