import { z } from 'zod';

export const DeployDevboxHeaderSchema = z.object({
  Authorization: z.string().describe('Use kubeconfig to login')
});

export const DeployDevboxRequestSchema = z.object({
  devboxName: z.string().min(1).describe('Devbox name'),
  tag: z.string().min(1).describe('Devbox tag'),
  cpu: z.number().min(0).default(200).describe('CPU cores'),
  memory: z.number().min(0).default(128).describe('Memory in MB')
});

export const DeployDevboxSuccessResponseSchema = z.object({
  data: z.object({
    message: z.string().default('success deploy devbox'),
    appName: z.string(),
    publicDomains: z.array(z.string())
  })
});

export const DeployDevboxErrorResponseSchema = z.object({
  code: z.number(),
  error: z.any()
});
