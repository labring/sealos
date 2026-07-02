import { authSession } from '@/service/backend/auth';
import { getRegionList } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { Region } from '@/types/region';
import type { NextApiRequest, NextApiResponse } from 'next';

const getHeaderValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

const normalizeDomain = (domain?: string) =>
  (domain || '')
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase();

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }

    const regions = (await getRegionList()) || [];
    const currentRegionUid = global.AppConfig.cloud.regionUID;
    const currentDomain = normalizeDomain(
      global.AppConfig.cloud.domain ||
        getHeaderValue(req.headers['x-forwarded-host']) ||
        getHeaderValue(req.headers.host)
    );
    const currentRegionIdx = regions.findIndex((region: Region) => {
      if (currentRegionUid && region.uid === currentRegionUid) return true;
      return currentDomain && normalizeDomain(region.domain) === currentDomain;
    });
    if (regions.length > 1 && currentRegionIdx > 0) {
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
