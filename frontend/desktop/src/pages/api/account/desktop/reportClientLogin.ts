import { checkAndGrantUserRewards } from '@/services/backend/activity/rewards';
import { globalPrisma } from '@/services/backend/db/init';
import { verifyAccessToken, verifyGlobalToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Desktop 客户端登录事实上报（regional 或 global token）：
 * upsert DesktopLoginRecord（userUid 主键天然幂等，重复上报只刷新 lastSeenAt），
 * 随后触发资格检查。登录事实与活动可用性无关（审计事实照记），发奖内部有 gate。
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }
  try {
    const payload =
      (await verifyAccessToken(req.headers)) || (await verifyGlobalToken(req.headers));
    if (!payload) return jsonRes(res, { code: 401, message: 'invalid token' });

    const userUid = payload.userUid;
    const clientVersion =
      typeof req.body?.clientVersion === 'string' ? req.body.clientVersion : undefined;
    const authSource = typeof req.body?.authSource === 'string' ? req.body.authSource : undefined;

    const now = new Date();
    await globalPrisma.desktopLoginRecord.upsert({
      where: { userUid },
      create: { userUid, clientVersion, authSource, firstSeenAt: now, lastSeenAt: now },
      update: { lastSeenAt: now, clientVersion, authSource }
    });

    // 发奖失败只记日志，绝不能影响登录链路
    try {
      await checkAndGrantUserRewards(userUid);
    } catch (error) {
      console.error('reportClientLogin: checkAndGrantUserRewards failed', { userUid, error });
    }

    return jsonRes(res, { code: 200, data: {} });
  } catch (error) {
    console.error('reportClientLogin error:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
