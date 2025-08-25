import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { POST } from '@/services/requestLaf';
import { HandleEnum } from '@/types/cloudserver';
import { NextApiRequest, NextApiResponse } from 'next';

export type UpdateStatusPayload = {
  instanceName: string;
  handle: HandleEnum;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAccessToken(req);
    const { instanceName, handle } = req.body as UpdateStatusPayload;

    const handleToUrlMap = {
      [HandleEnum.Start]: '/action/start',
      [HandleEnum.Stop]: '/action/stop',
      [HandleEnum.Restart]: '/action/restart',
      [HandleEnum.Delete]: '/action/delete'
    };

    const url = handleToUrlMap[handle];
    console.log(url);

    if (!url) {
      return jsonRes(res, {
        code: 500,
        message: 'There is no API corresponding to this operation'
      });
    }

    const { data, error } = await POST(
      url,
      {
        instanceName: instanceName
      },
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );

    if (error) {
      return jsonRes(res, {
        code: 500,
        message: error
      });
    }

    return jsonRes(res, {
      data: data
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, error: error });
  }
}
