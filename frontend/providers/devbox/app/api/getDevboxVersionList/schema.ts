import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).describe('Devbox name'),
  devboxUid: z.string().min(1).describe('Devbox UID')
});

export const HeaderSchema = z.object({
  Authorization: z.string().describe('Use kubeconfig to login')
});

export const SuccessResponseSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string().describe('Version ID'),
        name: z.string().describe('Version name'),
        devboxName: z.string().describe('Devbox name'),
        createTime: z.string().describe('Creation time in YYYY-MM-DD HH:mm format'),
        tag: z.string().describe('Version tag'),
        status: z
          .object({
            value: z.string().describe('Status value'),
            label: z.string().describe('Status label')
          })
          .describe('Version status'),
        description: z.string().describe('Version description')
      })
    )
    .describe('List of devbox versions')
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  error: z.any().optional()
});
