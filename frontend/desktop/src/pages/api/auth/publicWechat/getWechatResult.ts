import { getWeChatAccessToken, verifyWechatCode } from '@/services/backend/db/wechatCode';
import { jsonRes } from '@/services/backend/response';
import { TWechatUser } from '@/types/user';
import { getBase64FromRemote } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
import { getGlobalToken } from '@/services/backend/globalAuth';
import { ProviderType } from 'prisma/global/generated/client';
import { getRegionToken } from '@/services/backend/regionAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const access_token = await getWeChatAccessToken();
    const { code } = req.query as { code: string };
    if (!code) {
      return jsonRes(res, {
        code: 400,
        data: 'Parameter error'
      });
    }

    const verifyInfo = await verifyWechatCode({ code });
    if (!verifyInfo?.openid) {
      return jsonRes(res, {
        code: 201,
        data: 'Verification code expired'
      });
    }

    const { openid } = verifyInfo;
    const userUrl = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${access_token}&openid=${openid}&lang=zh_CN`;
    const userInfo = (await (await fetch(userUrl)).json()) as TWechatUser;
    const avatar_url = (await getBase64FromRemote(userInfo?.headimgurl)) as string;

    if (!userInfo?.openid) {
      return jsonRes(res, {
        code: 500,
        message: 'Failed to obtain WeChat information'
      });
    }

    const _data = await getGlobalToken({
      provider: ProviderType.WECHAT,
      providerId: userInfo.openid,
      avatar_url,
      name: userInfo?.nickname
    });
    if (!_data)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    const data = await getRegionToken({
      userUid: _data.user.userUid,
      userId: _data.user.name
    });
    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data
    });
  } catch (err) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'service getWechatResult error'
    });
  }
}
