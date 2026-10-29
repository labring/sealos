import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AcquisitionError,
  requireIngestSecret,
  respond
} from '@/services/backend/acquisition/config';
import { acquisitionHttp } from '@/services/backend/acquisition/http';
import { acceptLifecycle } from '@/services/backend/acquisition/analytics';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };
const handler = (req: NextApiRequest, res: NextApiResponse) =>
  respond(res, async () => {
    if (req.method !== 'POST') throw new AcquisitionError(405, 'Method not allowed');
    requireIngestSecret(req);
    await acquisitionHttp(req);
    return res.status(202).json(await acceptLifecycle(req.body));
  });

export default handler;
