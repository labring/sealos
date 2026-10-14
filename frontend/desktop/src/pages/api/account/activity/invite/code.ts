import { buildInviteUrl } from '@/services/backend/activity/constants';
import { ensureInviteCode } from '@/services/backend/activity/registration';
import { isActivityAvailable } from '@/services/backend/activity/rewards';
import { verifyAccessToken, verifyGlobalToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 幂等 get-or-create 我的邀请码（regional 或 global token）。
 * status 接口不会自动创建码；用户显式打开邀请中心时才落库。
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    const inviteCode = await ensureInviteCode(payload.userUid);
    return jsonRes(res, {
      code: 200,
      data: {
        code: inviteCode.code,
        inviteUrl: buildInviteUrl(inviteCode.code)
      }
    });
  } catch (error) {
    console.error('activity/invite/code error:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
