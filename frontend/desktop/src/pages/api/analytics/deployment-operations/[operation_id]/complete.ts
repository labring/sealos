import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { AcquisitionError, respond } from '@/services/backend/acquisition/config';
import { acquisitionHttp } from '@/services/backend/acquisition/http';
import { nativeDeploymentActor } from '@/services/backend/acquisition/deployment-operations/kubernetes';
import { nativeDeploymentService } from '@/services/backend/acquisition/deployment-operations/service';

export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };
const handler = (req: NextApiRequest, res: NextApiResponse) =>
  respond(res, async () => {
    if (req.method !== 'POST') throw new AcquisitionError(405, 'Method not allowed');
    if (
      !z.string().uuid().safeParse(req.query.operation_id).success ||
      !z
        .object({ version: z.literal(1).optional() })
        .strict()
        .safeParse(req.body ?? {}).success
    )
      throw new AcquisitionError(400, 'Invalid completion request');
    await acquisitionHttp(req);
    const actor = await nativeDeploymentActor(req);
    const result = await nativeDeploymentService.complete(actor, req.query.operation_id as string);
    return res.status(result.status === 'pending' ? 202 : 200).json(result);
  });

export default handler;
