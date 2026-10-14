import { isActivityAvailable } from '@/services/backend/activity/rewards';
import { maskNickname } from '@/services/backend/activity/codes';
import { INVITE_COOKIE_MAX_AGE, INVITE_COOKIE_NAME } from '@/services/backend/activity/constants';
import { globalPrisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

const isHttpsRequest = (req: NextApiRequest) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return proto === 'https';
};

// 邀请上下文 cookie：httpOnly、SameSite=Lax、path=/、30 天（与 onetap 共享 cookie 的序列化风格一致）
const serializeInviteCookie = (code: string, secure: boolean) =>
  [
    `${INVITE_COOKIE_NAME}=${encodeURIComponent(code)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${INVITE_COOKIE_MAX_AGE}`,
    ...(secure ? ['Secure'] : [])
  ].join('; ');

/**
 * 公开接受邀请：校验邀请码并写邀请上下文 cookie。
 * cookie 只写一次（已存在则不覆盖），首次有效链接优先；
 * 无效/停用/活动不可用只返回原因，绝不阻断注册与正常使用。
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code) {
      return jsonRes(res, { code: 400, message: 'code is required' });
    }

    // 活动仅国内部署开放；国际部署明确返回不可用，不写 cookie
    if (!isActivityAvailable()) {
      return jsonRes(res, { code: 200, data: { valid: false, reason: 'unavailable' } });
    }

    const inviteCode = await globalPrisma.registrationInviteCode.findUnique({
      where: { code }
    });
    if (!inviteCode) {
      return jsonRes(res, { code: 200, data: { valid: false, reason: 'not_found' } });
    }
    if (!inviteCode.enabled) {
      return jsonRes(res, { code: 200, data: { valid: false, reason: 'disabled' } });
    }

    const inviter = await globalPrisma.user.findUnique({
      where: { uid: inviteCode.inviterUid },
      select: { nickname: true }
    });

    if (!req.cookies?.[INVITE_COOKIE_NAME]) {
      res.setHeader('Set-Cookie', serializeInviteCookie(code, isHttpsRequest(req)));
    }

    return jsonRes(res, {
      code: 200,
      data: {
        valid: true,
        // 只返回脱敏昵称，避免向未登录访客泄露邀请人信息
        inviterNickname: maskNickname(inviter?.nickname)
      }
    });
  } catch (error) {
    console.error('invite/accept error:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
