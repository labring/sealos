import type { NextApiRequest, NextApiResponse } from 'next';
import { handleK8sError, jsonRes } from './response';

/**
 * Error handling middleware
 * Automatically catches async errors and handles them uniformly using handleK8sError
 *
 * @example
 * export default withErrorHandler(async function handler(req, res) {
 *   const { databaseName } = req.query;
 *   if (!databaseName) {
 *     return jsonRes(res, {
 *       code: ResponseCode.BAD_REQUEST,
 *       error: 'Database name is required'
 *     });
 *   }
 *
 *   await pauseDatabase(k8s, { params: { databaseName } }, req);
 *
 *   jsonRes(res, { message: 'Success' });
 * });
 */
export function withErrorHandler<T = any>(
  handler: (req: NextApiRequest, res: NextApiResponse<T>) => Promise<void | NextApiResponse<T>>
) {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    try {
      const result = await handler(req, res);
      // Allow handler to return the response object
      if (result && result !== res) {
        return result;
      }
    } catch (err: any) {
      console.error('API Error:', err?.body || err?.message || err);
      jsonRes(res, handleK8sError(err));
    }
  };
}

/**
 * Composable middleware utility
 * Allows chaining multiple middlewares
 *
 * @example
 * export default compose(
 *   withAuth,
 *   withErrorHandler
 * )(async function handler(req, res) {
 *   // Business logic
 * });
 */
export function compose(...middlewares: Function[]) {
  return (handler: Function) => {
    return middlewares.reduceRight((acc, middleware) => {
      return middleware(acc);
    }, handler);
  };
}
