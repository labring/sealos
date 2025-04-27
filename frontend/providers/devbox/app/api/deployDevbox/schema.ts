import { z } from 'zod';

export const DeployDevboxHeaderSchema = z.object({
  Authorization: z.string().describe('Use kubeconfig to login')
});

export const DeployDevboxRequestSchema = z.object({
  devboxName: z.string().min(1).describe('Devbox name'),
  tag: z.string().min(1).describe('Devbox tag'),
  cpu: z
    .number()
    .min(0)
    .default(2000)
    .describe(
      'CPU cores, it is recommended to use options like 1000, 2000, 4000, 8000, 16000, representing 1Core, 2Core, 4Core, 8Core, 16Core'
    ),
  memory: z
    .number()
    .min(0)
    .default(4096)
    .describe(
      'Memory in MB, it is recommended to use options like 2048, 4096, 8192, 16384, 32768, representing 2G, 4G, 8G, 16G, 32G'
    )
});

export const DeployDevboxSuccessResponseSchema = z.object({
  data: z.object({
    message: z.string().default('success deploy devbox').describe('Deploy devbox success message'),
    appName: z.string().describe('Application name'),
    publicDomains: z.array(z.string()).describe('Public domains')
  })
});

export const DeployDevboxErrorResponseSchema = z.object({
  code: z.number(),
  error: z.any()
});
