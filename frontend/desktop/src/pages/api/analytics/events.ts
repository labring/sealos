import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyOAuth2AccessToken } from '@/services/backend/auth';
import { AcquisitionError, respond } from '@/services/backend/acquisition/config';
import { acquisitionHttp } from '@/services/backend/acquisition/http';
import { acceptAppEvent } from '@/services/backend/acquisition/analytics';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };
const handler = (req: NextApiRequest, res: NextApiResponse) =>
  respond(res, async () => {
    if (req.method !== 'POST') throw new AcquisitionError(405, 'Method not allowed');
    if (req.headers.origin) throw new AcquisitionError(403, 'Native events only');
    await acquisitionHttp(req);
    let uid: string | undefined;
    if (req.headers.authorization) {
      const token = req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : '';
      const claims = await verifyOAuth2AccessToken(token);
      const clients = (
        process.env.ACQUISITION_NATIVE_CLIENT_IDS || 'sealos-io,sealox-desktop-bja'
      ).split(',');
      if (!claims || !clients.includes(claims.client_id))
        throw new AcquisitionError(401, 'Invalid native authentication');
      uid = claims.sub;
    }
    return res.status(202).json(await acceptAppEvent(req.body, uid));
  });

export default handler;
