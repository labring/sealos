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
 * 分页查询我的邀请记录（regional 或 global token）：
 * 只返回本人记录，受邀人昵称脱敏（首字符 + ***），不含 uid/手机号/实名材料。
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }
  try {
    // 国际部署不参与活动：显式返回不可用
    if (!isActivityAvailable()) {
      return jsonRes(res, { code: 503, message: 'Activity unavailable' });
    }
    const payload =
      (await verifyAccessToken(req.headers)) || (await verifyGlobalToken(req.headers));
    if (!payload) return jsonRes(res, { code: 401, message: 'invalid token' });

    // 默认 1/10，pageSize 上限 50，防止全表拖库
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = Math.min(parsePositiveInt(req.query.pageSize, 10), 50);

    const data = await getInviteRecordList(payload.userUid, page, pageSize);
    return jsonRes(res, { code: 200, data });
  } catch (error) {
    console.error('activity/invite/records error:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
