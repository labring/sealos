import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { updateOrder } from '@/services/db/workorder';
import { ApiResp } from '@/services/kubernet';
import { WorkOrderStatus, WorkOrderType } from '@/types/workorder';
import type { NextApiRequest, NextApiResponse } from 'next';

export type FeishuNotificationParams = {
  type: WorkOrderType;
  description: string;
  orderId: string;
  switchToManual?: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const {
      type,
      description,
      orderId,
      switchToManual = false
    } = req.body as FeishuNotificationParams;

    const { userId, regionUid } = await verifyAccessToken(req);
    const feishuUrl = process.env.ADMIN_FEISHU_URL;
    const feishuCallBackUrl = process.env.ADMIN_FEISHU_CALLBACK_URL;
    const title = switchToManual ? `工单：${orderId}，请求人工处理` : '有新的工单，请立即查看';

    if (switchToManual) {
      await updateOrder({
        orderId,
        userId: userId,
        updates: {
          status: WorkOrderStatus.Processing,
          manualHandling: { isManuallyHandled: true }
        }
      });
    }

    const payload = {
      msg_type: 'interactive',
      card: {
        elements: [
          {
            tag: 'markdown',
            content: `**用户ID:** ${userId}\n**可用区ID:** ${regionUid}\n所属分类: ${type}\n描述信息: ${description}`
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
                  url: feishuCallBackUrl + `?orderId=${orderId}`,
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
            content: title,
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
