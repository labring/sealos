import type { NextApiRequest, NextApiResponse } from 'next';
import { AcquisitionError, respond } from '@/services/backend/acquisition/config';
import { acquisitionHttp } from '@/services/backend/acquisition/http';
import { nativeDeploymentActor } from '@/services/backend/acquisition/deployment-operations/kubernetes';
import { nativeDeploymentService } from '@/services/backend/acquisition/deployment-operations/service';

export const config = { api: { bodyParser: { sizeLimit: '12kb' } } };
const handler = (req: NextApiRequest, res: NextApiResponse) =>
  respond(res, async () => {
    if (req.method !== 'POST') throw new AcquisitionError(405, 'Method not allowed');
    await acquisitionHttp(req);
    const actor = await nativeDeploymentActor(req);
    return res.status(201).json(await nativeDeploymentService.register(actor, req.body));
  });

export default handler;
