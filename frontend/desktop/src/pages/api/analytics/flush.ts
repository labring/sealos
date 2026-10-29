import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AcquisitionError,
  requireIngestSecret,
  respond
} from '@/services/backend/acquisition/config';
import { acquisitionHttp } from '@/services/backend/acquisition/http';
import { flushAnalytics } from '@/services/backend/acquisition/analytics';
import { reconcileNativeDeploymentOperations } from '@/services/backend/acquisition/deployment-operations/service';

const handler = (req: NextApiRequest, res: NextApiResponse) =>
  respond(res, async () => {
    if (req.method !== 'POST') throw new AcquisitionError(405, 'Method not allowed');
    requireIngestSecret(req);
    await acquisitionHttp(req);
    try {
      await reconcileNativeDeploymentOperations();
    } catch {
      console.warn('Native deployment attribution reconciliation unavailable');
    }
    return res.status(200).json(await flushAnalytics());
  });

export default handler;
