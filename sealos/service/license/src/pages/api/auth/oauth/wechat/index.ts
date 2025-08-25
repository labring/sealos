import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
const APP_ID = process.env.WECHAT_CLIENT_ID!;
const APP_SECRET = process.env.WECHAT_CLIENT_SECRET!;
import { TWechatToken, TWechatUser } from '@/types/user';
import { Session } from '@/types/session';
import { getBase64FromRemote } from '@/utils/tools';
import { getOauthRes } from '@/services/backend/oauth';
import { enableWechat } from '@/services/enable';

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
    const {
      nickname: name,
      unionid: id,
      headimgurl
    } = (await (await fetch(userUrl)).json()) as TWechatUser;
    const avatar_url = (await getBase64FromRemote(headimgurl)) as string;
    const data = await getOauthRes({ provider: 'wechat', id: '' + id || openid, name, avatar_url });
    return jsonRes<Session>(res, {
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
