import type { NextApiRequest, NextApiResponse } from 'next';
import { handleK8sError, jsonRes } from './response';

/**
 * Error handling middleware
 * Automatically catches async errors and handles them uniformly using handleK8sError
 *
 * @example
 * export default withErrorHandler(async function handler(req, res) {
 *   const { appName } = req.query;
 *   if (!appName) {
 *     return jsonRes(res, {
 *       code: ResponseCode.BAD_REQUEST,
 *       error: 'App name is required'
 *     });
 *   }
 *
 *   const k8s = await createK8sContext(req);
 *   await pauseApp(appName, k8s);
 *
 *   jsonRes(res, { message: 'Success' });
 * });
 */
export function withErrorHandler<T = any>(
  handler: (req: NextApiRequest, res: NextApiResponse<T>) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      console.error('API Error:', err);
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
