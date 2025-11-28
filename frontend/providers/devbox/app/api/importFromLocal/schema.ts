import { z } from 'zod';

export const LocalImportRequestSchema = z.object({
  name: z.string().min(1).max(63).regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, 'Invalid devbox name format'),
  runtime: z.string().min(1, 'Runtime is required'),
  templateUid: z.string().uuid('Invalid template UID'),
  containerPort: z.number().min(1).max(65535, 'Port must be between 1-65535'),
  startupCommand: z.string().optional(),
  cpu: z.number().positive(),
  memory: z.number().positive()
});

export type LocalImportRequest = z.infer<typeof LocalImportRequestSchema>;

const ZIP_MAGIC_BYTES = [0x50, 0x4b, 0x03, 0x04];

export function validateZipFile(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }

  for (let i = 0; i < ZIP_MAGIC_BYTES.length; i++) {
    if (buffer[i] !== ZIP_MAGIC_BYTES[i]) {
      return false;
    }
  }

  return true;
}
