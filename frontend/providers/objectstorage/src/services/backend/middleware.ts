import { NextApiRequest, NextApiResponse } from 'next';
import { handleK8sError, jsonRes } from './response';

/**
 * Unified error handling middleware for Next.js API routes
 * Wraps API handlers to automatically catch and process errors
 *
 * @param handler - The API route handler function
 * @returns Wrapped handler with error catching
 */
export const withErrorHandler = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('API Error:', error?.body || error?.message || error);
      const errorResponse = handleK8sError(error);
      return jsonRes(res, errorResponse);
    }
  };
};
