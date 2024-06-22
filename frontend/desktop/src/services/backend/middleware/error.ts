import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '../response';
import { RESPONSE_MESSAGE } from '@/types/response/utils';

export const ErrorHandler =
  (handler: NextApiHandler, message: string = RESPONSE_MESSAGE.INTERNAL_SERVER_ERROR) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.log(error);
      jsonRes(res, {
        message,
        code: 500
      });
    }
  };
