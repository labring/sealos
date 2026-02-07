import { authSession } from '@/service/backend/auth';
import { getRegionByUid, makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Get resource configuration and pricing information
 *
 * Backend should return format:
 * {
 *   properties: [
 *     { name: "cpu", enum: 0, unit_price: 2.4444, unit: "1m" },
 *     { name: "memory", enum: 1, unit_price: 1.092501427, unit: "1Mi" },
 *     { name: "gpu-kunlunxin-P800", alias: "kunlunxin-P800", enum: 6, unit_price: 1500, unit: "1m" }
 *   ]
 * }
 * Note: enum value should match the key in billing API's used/used_amount
 */
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const { regionUid } = req.body as { regionUid: string };
    const region = await getRegionByUid(regionUid);
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return;
    const response = await client.post('/account/v1alpha1/properties');
    const res = response.data;
    console.log(res.data, 'properties response');
    return jsonRes(resp, {
      code: 200,
      data: res.data,
      message: res.message
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get billing cost error' });
  }
}
