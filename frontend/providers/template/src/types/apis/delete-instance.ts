import * as z from 'zod';

/**
 * Path parameters for delete instance endpoint
 */
export const pathParams = z.object({
  instanceName: z
    .string()
    .describe('Name of the deployed template instance to delete (must exist in user namespace)')
});

/**
 * Response schema for delete instance endpoint
 */
export const response = z.object({
  code: z.number().describe('HTTP status code (200 for success, 401/404/500 for error)'),
  message: z.string().describe('Success or error message describing the operation result')
});
