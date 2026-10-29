import { NextApiRequest, NextApiResponse } from 'next';
import {
  beginCodeAuthorization,
  codeCookieName,
  codeOrigin
} from '@/services/backend/oauth2/authorization-code';
import { codeParameters, codeResponse, limitCodeHttp } from '@/services/backend/oauth2/code-http';
import { beginAcquisition } from '@/services/backend/acquisition/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return codeResponse(res, async () => {
    if (req.method !== 'GET') return res.status(405).end();
    await limitCodeHttp(req);
    const params = codeParameters(req.query);
    const result = await beginCodeAuthorization(params);
    if ('redirect' in result) return res.redirect(302, result.redirect!);
    res.setHeader(
      'Set-Cookie',
      `${codeCookieName(result.requestId)}=${
        result.browserSecret
      }; HttpOnly; SameSite=Lax; Path=/api/auth/oauth2/code; Max-Age=600${
        codeOrigin().startsWith('https:') ? '; Secure' : ''
      }`
    );
    const attributionRedirect = await beginAcquisition(params, result.requestId, codeOrigin());
    return res.redirect(302, attributionRedirect || `/oauth2/code?request_id=${result.requestId}`);
  });
}
