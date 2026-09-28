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
      const statusCode =
        error &&
        typeof error === 'object' &&
        'statusCode' in error &&
        typeof error.statusCode === 'number'
          ? error.statusCode
          : 500;
      jsonRes(res, {
        message,
        code: statusCode
      });
    }
  };
