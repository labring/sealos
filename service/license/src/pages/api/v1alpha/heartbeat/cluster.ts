import {ClusterHeartbeat} from '@/services/backend/heartbeat/cluster';
import {jsonRes} from '@/services/backend/response';
import type {NextApiRequest, NextApiResponse} from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await ClusterHeartbeat({
      clusterID: req.body.clusterID,
      clusterResource: req.body.clusterResource
    });
    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, {code: 500, data: error});
  }
}
