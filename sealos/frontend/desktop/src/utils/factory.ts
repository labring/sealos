import { NextApiRequest, NextApiResponse } from 'next';
// 工厂函数实现
export const createMiddleware = <Ctx extends unknown = void, T extends unknown = void>(
  handler: (params: {
    req: NextApiRequest;
    res: NextApiResponse;
    next: (data: T) => Promise<void>;
    ctx: Ctx;
  }) => Promise<void>
): ((
  ctx: Ctx
) => (req: NextApiRequest, res: NextApiResponse, next?: (data: T) => void) => Promise<void>) => {
  return (ctx: Ctx) => async (req, res, next) => {
    await handler({
      req,
      res,
      next(data) {
        return Promise.resolve(next?.(data));
      },
      ctx
    });
  };
};
