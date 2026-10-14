import { checkAndGrantUserRewards } from '@/services/backend/activity/rewards';
import { getActivityStatusData } from '@/services/backend/activity/status';
import { verifyAccessToken, verifyGlobalToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 活动状态查询（regional 或 global token）：
 * 先跑自身 checkAndGrantUserRewards（覆盖老用户补领），失败不阻塞返回；
 * 金额为 credit 单位字符串，客户端按 1¥=1e6 展示。
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }
  try {
    const payload =
      (await verifyAccessToken(req.headers)) || (await verifyGlobalToken(req.headers));
    if (!payload) return jsonRes(res, { code: 401, message: 'invalid token' });

    // 资格检查内部自带 gate 与幂等；此处失败不影响状态返回（下一轮触发再补）
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
