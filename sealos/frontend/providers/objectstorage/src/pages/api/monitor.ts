import { ApiResp, jsonRes } from '@/services/backend/response';
import axios from 'axios';
import { sub } from 'date-fns';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const { bucket } = req.body as { bucket?: string };
    if (!bucket) return jsonRes(res, { code: 400, data: { error: 'bucketName is invaild' } });
    const now = Date.now();
    const queries = [
      'minio_bucket_usage_object_total',
      'minio_bucket_usage_total_bytes',
      'minio_bucket_traffic_received_bytes',
      'minio_bucket_traffic_sent_bytes'
    ];
    const result = [];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      result.push(
        axios({
          baseURL: process.env.MONITOR_URL!,
          // responseType: 'stream',
          method: 'GET',
          headers: {
            Authorization: encodeURIComponent(client.kc.exportConfig())
          },
          params: {
            query,
            type: 'minio',
            namespace: client.namespace,
            app: bucket,
            start: sub(now, { hours: 24 }).getTime() / 1000,
            end: now / 1000,
            step: 60
          }
        })
      );
    }
    await Promise.all(result).then((resArr) => {
      if (resArr.every((response) => response.data.status === 'success')) {
        return jsonRes(res, {
          data: resArr.map((v, i) => {
            const result = v.data.data.result;
            result.name = queries[i];
            return result;
          })
        });
      } else {
        return jsonRes(res, { data: resArr.map((v) => v.data) });
      }
    });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'get bucket error'
    });
  }
}
