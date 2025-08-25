import { getVersion } from '@/services/enable';
import { createMiddleware } from '@/utils/factory';
import { jsonRes } from '../response';
import { HttpStatusCode } from 'axios';

export const cnVersionMiddleware = createMiddleware(async ({ req, res, next }) => {
  if (getVersion() !== 'cn')
    return jsonRes(res, {
      message: 'not support',
      code: HttpStatusCode.InternalServerError
    });
  next();
});
export const enVersionMiddleware = createMiddleware(async ({ req, res, next }) => {
  if (getVersion() !== 'en')
    return jsonRes(res, {
      message: 'not support',
      code: HttpStatusCode.InternalServerError
    });
  next();
});
