import * as z from 'zod';

export const pathParams = z.object({
  databaseName: z.string()
});
