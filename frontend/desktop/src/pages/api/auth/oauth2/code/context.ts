import { NextApiRequest, NextApiResponse } from 'next';
import { codeContext } from '@/services/backend/oauth2/authorization-code';
import {
  codeBrowserUser,
  codeParameters,
  codeResponse,
  limitCodeHttp
} from '@/services/backend/oauth2/code-http';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return codeResponse(res, async () => {
    if (req.method !== 'GET') return res.status(405).end();
    await limitCodeHttp(req);
    const params = codeParameters(req.query);
    const auth = await codeBrowserUser(req, params);
    return res.status(200).json(await codeContext(params.request_id, auth.secret, auth.userUid));
  });
}
