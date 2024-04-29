import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '../response';

export const ErrorHandler =
  (handler: NextApiHandler, message = 'Internal Server Error') =>
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
