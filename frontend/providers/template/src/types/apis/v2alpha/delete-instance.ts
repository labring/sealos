import { z } from 'zod';
import { InstanceNamePathSchema, BaseResponseSchema } from './common/schema';

export const pathParams = InstanceNamePathSchema;

export const response = BaseResponseSchema.extend({
  code: z.number().describe('HTTP status code (200 for success, 401/404/500 for error)')
});
