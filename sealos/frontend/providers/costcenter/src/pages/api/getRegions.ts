import { authSession } from '@/service/backend/auth';
import { getRegionByUid, getRegionList } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { Region } from '@/types/region';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }

    const regions = (await getRegionList()) || [];
    const currentRegionUid = global.AppConfig.cloud.regionUID;
    const currentRegionIdx = regions.findIndex((region: Region) => region.uid === currentRegionUid);
    if (currentRegionIdx === -1) {
      throw Error('current region not found');
    }
    if (regions.length > 1 && currentRegionIdx !== 0) {
      // switch region-0 and region-[currentRegionIdx]
      const temp = regions[currentRegionIdx];
      regions[currentRegionIdx] = regions[0];
      regions[0] = temp;
    }
    if (!regions) throw Error('get all regions error');
    return jsonRes(resp, {
      code: 200,
      data: regions
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get billing cost error' });
  }
}
