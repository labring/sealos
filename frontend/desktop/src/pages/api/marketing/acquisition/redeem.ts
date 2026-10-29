import type { NextApiRequest, NextApiResponse } from 'next';
import { AcquisitionError, respond } from '@/services/backend/acquisition/config';
import { acquisitionHttp } from '@/services/backend/acquisition/http';
import { redeemAcquisition } from '@/services/backend/acquisition/service';

export const config = { api: { bodyParser: { sizeLimit: '2kb' } } };
const handler = (req: NextApiRequest, res: NextApiResponse) =>
  respond(res, async () => {
    if (req.method !== 'POST') throw new AcquisitionError(405, 'Method not allowed');
    if (req.headers.origin) throw new AcquisitionError(403, 'Native handoff only');
    await acquisitionHttp(req);
    return res.status(200).json(await redeemAcquisition(req.body));
  });

export default handler;
