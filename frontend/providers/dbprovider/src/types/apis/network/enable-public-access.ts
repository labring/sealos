import * as z from 'zod';

export const body = z.object({
  yamlList: z.array(z.string()).min(1, 'YAML list is required'),
  type: z.enum(['create', 'replace', 'update']).optional().default('create')
});

export const response = z.object({
  code: z.number(),
  message: z.string()
});
