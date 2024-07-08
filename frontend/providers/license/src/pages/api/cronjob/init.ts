import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
const cron = require('node-cron');
let hasAddedCron = false;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseurl = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}`;

  if (process.env.NODE_ENV !== 'production' && !hasAddedCron) {
    hasAddedCron = true;
    cron.schedule(
      '0 10 * * *',
      async () => {
        try {
          const result = await (await fetch(`${baseurl}/api/license/checkLicenses`)).json();
          console.log(result);
        } catch (error) {
          console.log(error);
        }
      },
      {
        scheduled: true,
        timezone: 'Asia/Shanghai'
      }
    );
  }

  jsonRes(res, {
    data: hasAddedCron
      ? 'Cron job is set up and running in production.'
      : 'Cron job setup skipped in development.'
  });
}
