import { checkAndGrantUserRewards } from '@/services/backend/activity/rewards';
import { globalPrisma } from '@/services/backend/db/init';
import { verifyOAuth2AccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

// P1：普通网页登录和区域 JWT 只能证明账号身份，不能证明完成过官方 Desktop 授权。
// 显式允许当前两个官方公开 client；不能按名字、body 或原生回调形状自动接纳第三方。
const DESKTOP_OAUTH_CLIENTS: Readonly<
  Record<
    string,
    {
      grants: readonly string[];
      redirectUri?: string;
    }
  >
> = {
  'af993c98-d19d-4bdc-b338-79b80dc4f8bf': {
    grants: ['urn:ietf:params:oauth:grant-type:device_code']
  },
  'sealox-desktop-bja': {
    grants: ['authorization_code', 'refresh_token'],
    redirectUri: 'http://127.0.0.1/callback'
  }
};

/**
 * Desktop 客户端登录事实上报（经核验的官方 OAuth access token）：
 * upsert DesktopLoginRecord（userUid 主键天然幂等，重复上报只刷新 lastSeenAt），
 * 随后触发资格检查。登录事实与活动可用性无关（审计事实照记），发奖内部有 gate。
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }
  try {
    const payload = await verifyOAuth2AccessToken(req.headers.authorization);
    const policy =
      payload &&
      typeof payload.client_id === 'string' &&
      Object.prototype.hasOwnProperty.call(DESKTOP_OAUTH_CLIENTS, payload.client_id)
        ? DESKTOP_OAUTH_CLIENTS[payload.client_id]
        : undefined;
    if (!payload || !policy) return jsonRes(res, { code: 401, message: 'invalid Desktop token' });

    // 已签名的 client_id 还必须保有官方客户端登记；删除或收回 grant 后不能继续上报。
    const client = await globalPrisma.oAuthClient.findUnique({
      where: { clientId: payload.client_id }
    });
    if (
      !client ||
      client.clientType !== 'PUBLIC' ||
      !policy.grants.every((grant) => client.allowedGrantTypes.includes(grant)) ||
      (policy.redirectUri && !client.redirectUris.includes(policy.redirectUri))
    ) {
      return jsonRes(res, { code: 401, message: 'invalid Desktop client' });
    }
    const userUid = payload.sub;
    const clientVersion =
      typeof req.body?.clientVersion === 'string' ? req.body.clientVersion : undefined;
    // access token 不含 grant 类型：只记录服务端核验的 client，不信任 body.authSource。
    const authSource = `oauth2_client:${payload.client_id}`;

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
