import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const feishuUrl = process.env.ADMIN_FEISHU_URL;
    const feishuCallBackUrl = process.env.ADMIN_FEISHU_CALLBACK_URL;

    const payload = {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: '工单提醒',
            content: [
              [
                {
                  tag: 'text',
                  text: '有新工单: '
                },
                {
                  tag: 'a',
                  text: '请查看链接',
                  href: feishuCallBackUrl
                }
              ]
            ]
          }
        }
      }
    };

    if (!feishuUrl) {
      return jsonRes(res, {
        code: 500,
        message: 'Missing Feishu API'
      });
    }
    const data = await fetch(feishuUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await data.json();
    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, {
      code: 500,
      error
    });
  }
}
