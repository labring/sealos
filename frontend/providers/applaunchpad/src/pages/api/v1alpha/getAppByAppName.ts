import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetAppByAppName } from '../getAppByAppName';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName } = req.query as { appName: string };
    if (!appName) {
      throw new Error('appName is empty');
    }

    const response = await GetAppByAppName({ appName, req });

    // Check for errors other than 404
    const responseData = response
      .map((item) => {
        if (item.status === 'fulfilled') return item.value.body;
        if (+item.reason?.body?.code === 404) return '';
        throw new Error('Get APP Deployment Error');
      })
      .filter((item) => item)
      .flat();

    jsonRes(res, {
      data: responseData
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
