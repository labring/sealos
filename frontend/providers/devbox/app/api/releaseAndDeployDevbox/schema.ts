import { z } from 'zod';

export const ReleaseAndDeployDevboxRequestSchema = z.object({
  devboxName: z.string().describe('Devbox name'),
  tag: z.string().describe('Release tag'),
  releaseDes: z.string().describe('Release description'),
  devboxUid: z.string().describe('Devbox UID'),
  cpu: z
    .number()
    .default(2000)
    .describe(
      'CPU cores, it is recommended to use options like 1000, 2000, 4000, 8000, 16000, representing 1Core, 2Core, 4Core, 8Core, 16Core'
    ),
  memory: z.number().default(4096).describe('Memory in MB')
});

export const ReleaseAndDeployDevboxResponseSchema = z.object({
  code: z.number(),
  data: z
    .object({
      message: z.string().describe('Release and deploy devbox success message'),
      appName: z.string().describe('Application name'),
      publicDomains: z
        .array(
          z.object({
            host: z.string(),
            port: z.number()
          })
        )
        .describe('Public domains')
    })
    .optional(),
  error: z.any().optional()
});

export type ReleaseAndDeployDevboxRequest = z.infer<typeof ReleaseAndDeployDevboxRequestSchema>;
export type ReleaseAndDeployDevboxResponse = z.infer<typeof ReleaseAndDeployDevboxResponseSchema>;
