import { isActivityAvailable } from '@/services/backend/activity/rewards';
import { getInviteRecordList } from '@/services/backend/activity/status';
import { verifyAccessToken, verifyGlobalToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Paginated query of the caller's invite records (regional or global token):
 * returns only the caller's own records; invitee nicknames are masked
 * (first character + ***); never returns uid / phone / realname materials.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }
  try {
    // International deployments don't participate in the activity
    if (!isActivityAvailable()) {
      return jsonRes(res, { code: 503, message: 'Activity unavailable' });
    }
    const payload =
      (await verifyAccessToken(req.headers)) || (await verifyGlobalToken(req.headers));
    if (!payload) return jsonRes(res, { code: 401, message: 'invalid token' });

    // pageSize is capped at 50 to prevent dumping the whole table
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = Math.min(parsePositiveInt(req.query.pageSize, 10), 50);

    const data = await getInviteRecordList(payload.userUid, page, pageSize);
    return jsonRes(res, { code: 200, data });
  } catch (error) {
    console.error('activity/invite/records error:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
