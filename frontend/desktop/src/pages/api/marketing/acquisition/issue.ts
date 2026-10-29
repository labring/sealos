import type { NextApiRequest, NextApiResponse } from 'next';
import { respond, websiteCors } from '@/services/backend/acquisition/config';
import { acquisitionHttp } from '@/services/backend/acquisition/http';
import { issueAcquisition } from '@/services/backend/acquisition/service';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };
const handler = (req: NextApiRequest, res: NextApiResponse) =>
  respond(res, async () => {
    if (!websiteCors(req, res)) return;
    await acquisitionHttp(req);
    return res.status(201).json(await issueAcquisition(req.body, req.headers.origin!));
  });

export default handler;
