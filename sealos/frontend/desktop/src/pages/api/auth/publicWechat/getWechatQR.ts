import { getWeChatAccessToken } from '@/services/backend/db/wechatCode';
import { jsonRes } from '@/services/backend/response';
import { nanoid } from 'nanoid';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const access_token = await getWeChatAccessToken();
    if (!access_token) {
      return jsonRes(res, {
        message: 'Failed to authenticate with wechat',
        code: 400,
        data: 'access_token is null'
      });
    }

    const sceneStr = nanoid(8);

    const ticketPayload = {
      expire_seconds: 1 * 60 * 60, // s
      action_name: 'QR_STR_SCENE',
      action_info: { scene: { scene_str: sceneStr } }
    };

    const ticketInfo = (await (
      await fetch(`https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${access_token}`, {
        method: 'POST',
        body: JSON.stringify(ticketPayload)
      })
    ).json()) as { ticket: string; expire_seconds: number; url: string; errcode: number };

    if (ticketInfo.errcode === 40001) {
      return jsonRes(res, { code: 201, message: 'ticket error try again' });
    }

    const qrCodeUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(
      ticketInfo.ticket
    )}`;

    return jsonRes(res, {
      code: 200,
      data: {
        code: sceneStr,
        codeUrl: qrCodeUrl
      }
    });
  } catch (err) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'service getWechatQR error'
    });
  }
}
