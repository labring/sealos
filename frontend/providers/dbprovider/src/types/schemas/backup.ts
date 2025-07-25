import * as z from 'zod';

export const autoBackupTypeSchema = z.union([
  z.literal('day'),
  z.literal('hour'),
  z.literal('week')
]);

export const autoBackupFormSchema = z.object({
  start: z.boolean(),
  type: autoBackupTypeSchema,
  week: z.array(z.string()),
  hour: z.string(),
  minute: z.string(),
  saveTime: z.number(),
  saveType: z.string()
});
