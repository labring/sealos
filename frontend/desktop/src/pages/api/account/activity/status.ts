import { checkAndGrantUserRewards } from '@/services/backend/activity/rewards';
import { getActivityStatusData } from '@/services/backend/activity/status';
import { verifyAccessToken, verifyGlobalToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Activity status query (regional or global token):
 * runs checkAndGrantUserRewards for the caller first (covers catch-up grants for
 * existing users); a failure there must not block the response. Amounts are
 * credit-unit strings; the client renders 1 CNY = 1e6.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }
  try {
    const payload =
      (await verifyAccessToken(req.headers)) || (await verifyGlobalToken(req.headers));
    if (!payload) return jsonRes(res, { code: 401, message: 'invalid token' });

    // The eligibility check is internally gated and idempotent; a failure here does
    // not affect the status response (the next trigger catches up)
    try {
      await checkAndGrantUserRewards(payload.userUid);
    } catch (error) {
      console.error('activity/status: checkAndGrantUserRewards failed', {
        userUid: payload.userUid,
        error
      });
    }

    const data = await getActivityStatusData(payload.userUid);
    return jsonRes(res, { code: 200, data });
  } catch (error) {
    console.error('activity/status error:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
