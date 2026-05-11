import { z } from 'zod';
import { InstanceNamePathSchema } from './common/schema';

export const pathParams = InstanceNamePathSchema;

/** Successful DELETE returns 204 No Content. */
export const response = z.void().describe('No response body for successful deletion');
