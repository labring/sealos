import { NextApiRequest, NextApiResponse } from 'next';
import { revokeCodeToken } from '@/services/backend/oauth2/authorization-code';
import { codeParameters, codeResponse, limitCodeHttp } from '@/services/backend/oauth2/code-http';
import { OAuth2HttpError } from '@/services/backend/oauth2/errors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return codeResponse(res, async () => {
    if (req.method !== 'POST') return res.status(405).end();
    await limitCodeHttp(req, false);
    const params = codeParameters(req.body);
    if (!params.token || !params.client_id) throw new OAuth2HttpError(400, 'invalid_request');
    await revokeCodeToken(params.client_id, params.token);
    return res.status(200).end();
  });
}
