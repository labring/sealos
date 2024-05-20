import { connectToDatabase } from './mongodb';

type TWechatVerifyCode = {
  openid: string;
  code: string;
  createTime: Date;
  expireTime: Date;
};

async function connectToUserCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<TWechatVerifyCode>('wechat-verify-code');
  return collection;
}

export async function addOrUpdateWechatCode({ openid, code }: { openid: string; code: string }) {
  const codes = await connectToUserCollection();
  const currentTime = new Date();
  const expireTime = new Date(currentTime.getTime() + 5 * 60 * 1000);
  const result = await codes.updateOne(
    {
      openid
    },
    {
      $set: {
        code,
        createTime: currentTime,
        expireTime: expireTime
      }
    },
    {
      upsert: true
    }
  );
  return result;
}

export async function verifyWechatCode({ code }: { code: string }) {
  const codes = await connectToUserCollection();
  const result = await codes.findOne({
    code,
    expireTime: { $gt: new Date() }
  });
  return result;
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
  } else {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`,
      { headers: { Accept: 'application/json' } }
    );
    const { access_token: newAccessToken, expires_in: newExpiresIn } = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    global.WechatAccessToken = newAccessToken;
    global.WechatExpiresIn = Date.now() + newExpiresIn * 1000 - 10 * 60 * 1000; //ms
    return global.WechatAccessToken;
  }
}
