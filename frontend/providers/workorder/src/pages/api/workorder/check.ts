import { verifyDesktopToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { getUserById } from '@/services/db/user';
import { fetchProcessingOrders, updateOrder } from '@/services/db/workorder';
import { WorkOrderDB, WorkOrderStatus } from '@/types/workorder';
import { NextApiRequest, NextApiResponse } from 'next';

const feishuUrl = process.env.ADMIN_FEISHU_URL;
const feishuCallBackUrl = process.env.ADMIN_FEISHU_CALLBACK_URL;
const adminToken = process.env.ADMIN_API_TOKEN;
const MINUTES_IN_A_WEEK = 7 * 24 * 60;

const getFeishuForm = ({
  recentUnresponded,
  overdueAutoCloseIn7Days
}: {
  recentUnresponded: WorkOrderDB[];
  overdueAutoCloseIn7Days: WorkOrderDB[];
}) => {
  const content1 = recentUnresponded
    .map((item) => `- [${item.orderId}](${feishuCallBackUrl}?orderId=${item.orderId})`)
    .join('\n');

  const content2 = overdueAutoCloseIn7Days
    .map((item) => `- [${item.orderId}](${feishuCallBackUrl}?orderId=${item.orderId})`)
    .join('\n');

  const form = {
    msg_type: 'interactive',
    card: {
      config: {},
      i18n_elements: {
        zh_cn: [
          {
            tag: 'markdown',
            content: '**收到用户消息，超过30分钟的工单**',
            text_align: 'left',
            text_size: 'normal',
            icon: {
              tag: 'standard_icon',
              token: 'vote_colorful',
              color: 'grey'
            }
          },
          {
            tag: 'markdown',
            content: content1,
            text_align: 'left',
            text_size: 'normal'
          },
          {
            tag: 'hr'
          },
          {
            tag: 'markdown',
            content: '**已自动关闭的工单**',
            text_align: 'left',
            text_size: 'normal',
            icon: {
              tag: 'standard_icon',
              token: 'todo_colorful',
              color: 'grey'
            }
          },
          {
            tag: 'markdown',
            content: content2,
            text_align: 'left',
            text_size: 'normal'
          }
        ]
      },
      i18n_header: {
        zh_cn: {
          title: {
            tag: 'plain_text',
            content: '工单消息提醒'
          },
          subtitle: {
            tag: 'plain_text',
            content: ''
          },
          template: 'indigo',
          ud_icon: {
            tag: 'standard_icon',
            token: 'myai_colorful'
          }
        }
      }
    }
  };

  return form;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!adminToken) {
      return jsonRes(res, {
        code: 401,
        message: "'token is invaild'"
      });
    }
    const payload = await verifyDesktopToken(adminToken);
    if (!payload?.userId) {
      return jsonRes(res, {
        code: 401,
        message: "'token is invaild'"
      });
    }
    const user = await getUserById(payload?.userId);
    if (!user?.isAdmin) {
      return jsonRes(res, {
        code: 403,
        message: 'Access denied'
      });
    }

    const orders = await fetchProcessingOrders();
    const recentUnresponded: WorkOrderDB[] = [];
    const overdueAutoCloseIn7Days: WorkOrderDB[] = [];
    const currentTime = new Date();
    orders.forEach((order) => {
      if (!order.dialogs || order.dialogs.length === 0) return;
      let lastDialog = order.dialogs[order.dialogs.length - 1];
      if (lastDialog.userId === 'robot') return;

      const lastDialogTime = new Date(lastDialog.time);
      const timeDiff = Math.ceil((currentTime.getTime() - lastDialogTime.getTime()) / 1000 / 60);
      if (!lastDialog.isAdmin && timeDiff > 30) {
        recentUnresponded.push(order);
      }
      if (lastDialog.isAdmin && timeDiff > MINUTES_IN_A_WEEK) {
        console.log(order);
        overdueAutoCloseIn7Days.push(order);
      }
    });

    if (recentUnresponded.length === 0 && overdueAutoCloseIn7Days.length === 0) {
      return jsonRes(res, {
        code: 204,
        message: 'No content to send'
      });
    }

    if (overdueAutoCloseIn7Days.length > 0) {
      try {
        for (const order of overdueAutoCloseIn7Days) {
          await updateOrder({
            orderId: order.orderId,
            userId: payload.userId,
            updates: {
              status: WorkOrderStatus.Completed
            }
          });
        }
      } catch (error) {}
    }

    const form = getFeishuForm({ overdueAutoCloseIn7Days, recentUnresponded });

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
      body: JSON.stringify(form)
    });
    const result = await data.json();
    jsonRes(res, {
      data: result
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, error: error });
  }
}
