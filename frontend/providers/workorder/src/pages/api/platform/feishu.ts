import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { WorkOrderEditForm } from '@/types/workorder';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const userForm = req.body as WorkOrderEditForm;
    const { userId } = await verifyAccessToken(req);
    const feishuUrl = process.env.ADMIN_FEISHU_URL;
    const feishuCallBackUrl = process.env.ADMIN_FEISHU_CALLBACK_URL;

    const payload = {
      msg_type: 'interactive',
      card: {
        elements: [
          {
            tag: 'markdown',
            content: `**用户ID:** ${userId}\n所属分类: ${userForm.type}\n描述信息: ${userForm.description}`
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: {
                  tag: 'plain_text',
                  content: '查看详情'
                },
                type: 'primary',
                multi_url: {
                  url: feishuCallBackUrl,
                  android_url: '',
                  ios_url: '',
                  pc_url: ''
                }
              }
            ]
          }
        ],
        header: {
          template: 'blue',
          title: {
            content: '有新的工单，请立即查看',
            tag: 'plain_text'
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
