import { prisma } from './init';
import { OAUTH_PROVIDERS, OAUTH_VERIFICATION_SCENARIOS } from '@/constants/verification';

type TWechatVerifyCode = {
  openid: string;
  code: string;
  createTime: Date;
  expireTime: Date;
};

const WECHAT_EXPIRE_MS = 5 * 60 * 1000;

export async function addOrUpdateWechatCode({ openid, code }: { openid: string; code: string }) {
  const activeVerification = await prisma.oAuthVerifications.findFirst({
    where: {
      provider: OAUTH_PROVIDERS.WECHAT,
      scenario: OAUTH_VERIFICATION_SCENARIOS.LOGIN_QR,
      providerId: openid,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  const expiresAt = new Date(Date.now() + WECHAT_EXPIRE_MS);

  if (activeVerification) {
    return prisma.oAuthVerifications.update({
      where: {
        uid: activeVerification.uid
      },
      data: {
        code,
        expiresAt
      }
    });
  }

  return prisma.oAuthVerifications.create({
    data: {
      provider: OAUTH_PROVIDERS.WECHAT,
      scenario: OAUTH_VERIFICATION_SCENARIOS.LOGIN_QR,
      providerId: openid,
      code,
      expiresAt
    }
  });
}

export async function verifyWechatCode({
  code
}: {
  code: string;
}): Promise<TWechatVerifyCode | null> {
  const result = await prisma.oAuthVerifications.findFirst({
    where: {
      provider: OAUTH_PROVIDERS.WECHAT,
      scenario: OAUTH_VERIFICATION_SCENARIOS.LOGIN_QR,
      code,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (!result?.providerId) return null;

  return {
    openid: result.providerId,
    code: result.code,
    createTime: result.createdAt,
    expireTime: result.expiresAt
  };
}

export async function hasWeChatAppSecret() {
  const APP_ID = global.AppConfig?.desktop.auth?.idp.wechat?.clientID;
  const APP_SECRET = global.AppConfig?.desktop.auth?.idp.wechat?.clientSecret;
  if (!APP_ID || !APP_SECRET) {
    throw new Error('Missing WeChat public account key');
  }
  return {
    APP_ID,
    APP_SECRET
  };
}

export async function getWeChatAccessToken() {
  const { APP_ID, APP_SECRET } = await hasWeChatAppSecret();

  function isAccessTokenValid(expiresIn: number) {
    const currentTime = Date.now();
    return expiresIn > currentTime;
  }

  if (
    global.WechatAccessToken &&
    global.WechatExpiresIn &&
    isAccessTokenValid(global.WechatExpiresIn)
  ) {
    return global.WechatAccessToken;
  }

  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`,
    { headers: { Accept: 'application/json' } }
  );
  const { access_token: newAccessToken, expires_in: newExpiresIn } = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  global.WechatAccessToken = newAccessToken;
  global.WechatExpiresIn = Date.now() + newExpiresIn * 1000 - 10 * 60 * 1000;
  return global.WechatAccessToken;
}
