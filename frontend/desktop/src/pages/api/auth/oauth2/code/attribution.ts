import type { NextApiRequest, NextApiResponse } from 'next';
import { AcquisitionError, respond, websiteCors } from '@/services/backend/acquisition/config';
import { acquisitionHttp } from '@/services/backend/acquisition/http';
import { acquisitionContinuation, attachAcquisition } from '@/services/backend/acquisition/service';
import { codeCookieName } from '@/services/backend/oauth2/authorization-code';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };
const handler = (req: NextApiRequest, res: NextApiResponse) =>
  respond(res, async () => {
    if (req.method === 'GET') {
      await acquisitionHttp(req);
      return res.redirect(
        302,
        await acquisitionContinuation(req.query.handoff, (id) => req.cookies[codeCookieName(id)])
      );
    }
    if (req.method !== 'POST' && req.method !== 'OPTIONS')
      throw new AcquisitionError(405, 'Method not allowed');
    if (!websiteCors(req, res)) return;
    await acquisitionHttp(req);
    await attachAcquisition(req.body, req.headers.origin!);
    return res.status(200).json({ attached: true });
  });

export default handler;
