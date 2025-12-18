import { NextApiRequest, NextApiResponse } from 'next';
import { handleK8sError, jsonRes } from './response';

/**
 * Middleware wrapper for Next.js API routes
 * Automatically catches async errors and handles them uniformly using handleK8sError
 *
 * @param handler The actual API route handler function
 * @returns Wrapped handler with automatic error handling
 *
 * @example
 * export default withErrorHandler(async (req, res) => {
 *   const result = await someK8sOperation();
 *   jsonRes(res, { data: result });
 * });
 */
export function withErrorHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      console.error('API Error:', err?.body || err);
      jsonRes(res, handleK8sError(err));
    }
  };
}
