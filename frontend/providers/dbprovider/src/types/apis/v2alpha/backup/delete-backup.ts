import * as z from 'zod';

export const queryParams = z.object({
  backupName: z.string().min(1, 'Backup name is required')
});
