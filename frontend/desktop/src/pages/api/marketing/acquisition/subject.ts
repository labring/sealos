import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import {
  AcquisitionError,
  requireIngestSecret,
  respond
} from '@/services/backend/acquisition/config';
import { acquisitionHttp } from '@/services/backend/acquisition/http';
import { subjectSnapshot } from '@/services/backend/acquisition/service';

const handler = (req: NextApiRequest, res: NextApiResponse) =>
  respond(res, async () => {
    if (req.method !== 'GET') throw new AcquisitionError(405, 'Method not allowed');
    requireIngestSecret(req);
    const uid = z.string().uuid().safeParse(req.query.subject_id);
    if (!uid.success) throw new AcquisitionError(400, 'Invalid subject');
    await acquisitionHttp(req);
    const snapshot = await subjectSnapshot(uid.data);
    if (!snapshot) throw new AcquisitionError(404, 'No permitted attribution snapshot');
    return res.status(200).json(snapshot);
  });

export default handler;
