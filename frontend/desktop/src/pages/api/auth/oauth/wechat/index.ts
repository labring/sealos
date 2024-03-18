import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';

const APP_ID = process.env.WECHAT_CLIENT_ID!;
const APP_SECRET = process.env.WECHAT_CLIENT_SECRET!;
import { TWechatToken, TWechatUser } from '@/types/user';
import { enableWechat } from '@/services/enable';
import { getGlobalToken } from '@/services/backend/globalAuth';
import { persistImage } from '@/services/backend/persistImage';
import { ProviderType } from 'prisma/global/generated/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enableWechat()) {
      throw new Error('wechat clinet is not defined');
    }
    const { code } = req.body;
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${APP_ID}&secret=${APP_SECRET}&code=${code}&grant_type=authorization_code`;
    const { access_token, openid } = (await (
      await fetch(url, { headers: { Accept: 'application/json' } })
    ).json()) as TWechatToken;

    if (!access_token || !openid) {
      return jsonRes(res, {
        message: 'Failed to authenticate with wechat',
        code: 400,
        data: 'access_token is null'
      });
    }

    const userUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`;
    const response = await fetch(userUrl);
    if (!response.ok)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    const { nickname: name, unionid: id, headimgurl } = (await response.json()) as TWechatUser;
    const avatar_url =
      (await persistImage(headimgurl, 'avatar/' + ProviderType.WECHAT + '/' + id)) || '';
    const data = await getGlobalToken({
      provider: ProviderType.WECHAT,
      id,
      avatar_url,
      name
    });
    if (!data)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    return jsonRes(res, {
      data,
      code: 200,
      message: 'Successfully'
    });
  } catch (err) {
    console.log(err);
    jsonRes(res, {
      message: 'Failed to authenticate with wechat',
      code: 500
    });
  }
}
