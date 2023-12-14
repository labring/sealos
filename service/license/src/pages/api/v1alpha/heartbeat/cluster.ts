import { ClusterHeartbeat } from '@/services/backend/heartbeat/cluster';
import { jsonRes } from '@/services/backend/response';
import { ClusterHeartbeatPayload } from '@/types/heartbeat/cluster';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * @param req clusterID clusterResource
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { clusterID, clusterResource } = req.body as ClusterHeartbeatPayload;
    if (!clusterID) {
      return jsonRes(res, { code: 400, message: 'Request parameter error' });
    }

    const result = await ClusterHeartbeat({
      clusterID: req.body.clusterID,
      clusterResource: req.body.clusterResource
    });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
