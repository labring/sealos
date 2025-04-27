import { z } from 'zod';

export const ReleaseAndDeployDevboxRequestSchema = z.object({
  devboxName: z.string(),
  tag: z.string(),
  releaseDes: z.string(),
  devboxUid: z.string(),
  cpu: z.number().default(200),
  memory: z.number().default(128)
});

export const ReleaseAndDeployDevboxResponseSchema = z.object({
  code: z.number(),
  data: z
    .object({
      message: z.string(),
      appName: z.string(),
      publicDomains: z.array(
        z.object({
          host: z.string(),
          port: z.number()
        })
      )
    })
    .optional(),
  error: z.any().optional()
});

export type ReleaseAndDeployDevboxRequest = z.infer<typeof ReleaseAndDeployDevboxRequestSchema>;
export type ReleaseAndDeployDevboxResponse = z.infer<typeof ReleaseAndDeployDevboxResponseSchema>;
