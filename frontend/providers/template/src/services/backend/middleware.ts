import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes, handleK8sError } from './response';
import { ResponseCode } from '@/types/response';

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

/**
 * Unified error handling middleware for Next.js API routes
 * Automatically catches errors and processes them with handleK8sError
 *
 * Usage:
 * export default withErrorHandler(async (req, res) => {
 *   // Your API logic here
 *   // Errors will be automatically caught and handled
 * });
 */
export const withErrorHandler = (handler: ApiHandler): ApiHandler => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      console.error('API Error:', err?.body || err?.message || err);

      // Use handleK8sError to process the error
      const errorResponse = handleK8sError(err?.body || err);

      return jsonRes(res, {
        code: errorResponse.code || ResponseCode.SERVER_ERROR,
        message: errorResponse.message,
        error: err?.body || err
      });
    }
  };
};
