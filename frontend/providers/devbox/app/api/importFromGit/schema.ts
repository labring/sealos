import { z } from 'zod';

export const GitImportRequestSchema = z.object({
  name: z.string().min(1).max(63).regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, 'Invalid devbox name format'),
  gitUrl: z.string().url('Invalid Git URL'),
  isPrivate: z.boolean(),
  token: z.string().optional(),
  runtime: z.string().min(1, 'Runtime is required'),
  templateUid: z.string().uuid('Invalid template UID'),
  containerPort: z.number().min(1).max(65535, 'Port must be between 1-65535'),
  startupCommand: z.string().optional(),
  cpu: z.number().positive(),
  memory: z.number().positive()
}).refine(
  (data) => {
    if (data.isPrivate) {
      return !!data.token;
    }
    return true;
  },
  {
    message: 'Token is required for private repositories',
    path: ['token']
  }
);

export type GitImportRequest = z.infer<typeof GitImportRequestSchema>;
