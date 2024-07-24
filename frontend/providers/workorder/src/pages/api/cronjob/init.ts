import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Cron } from 'croner';

const adminId = process.env.ADMIN_API_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { action } = req.query;
    const baseurl = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}`;

    if (!global.cronJobWorkOrders) {
      global.cronJobWorkOrders = new Cron(
        process.env.NODE_ENV === 'production' ? '0,30 10-17 * * 1-5' : '* * * * *',
        async () => {
          const result = await (
            await fetch(`${baseurl}/api/workorder/check?adminId=${adminId}`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${adminId}`,
                'Content-Type': 'application/json'
              }
            })
          ).json();
          const now = new Date();
          console.log(
            `Cron Job Run at: ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
          );
        },
        {
          timezone: 'Asia/Shanghai'
        }
      );
    }

    switch (action) {
      case 'pause':
        global.cronJobWorkOrders.pause();
        jsonRes(res, {
          data: 'Cron job paused'
        });
        break;
      case 'resume':
        global.cronJobWorkOrders.resume();
        jsonRes(res, {
          data: 'Cron job resumed'
        });
        break;
      case 'stop':
        global.cronJobWorkOrders.stop();
        jsonRes(res, {
          data: 'Cron job stopped'
        });
        break;
      default:
        jsonRes(res, {
          data: 'Cron job is running'
        });
    }
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
