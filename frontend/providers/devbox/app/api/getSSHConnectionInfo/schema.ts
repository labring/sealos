import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).describe('Devbox name to get SSH connection info')
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    base64PublicKey: z.string().describe('Base64 encoded public key'),
    base64PrivateKey: z.string().describe('Base64 encoded private key'),
    token: z.string().describe('JWT token for authentication'),
    userName: z.string().describe('SSH username'),
    workingDir: z.string().describe('Working directory'),
    releaseCommand: z.string().describe('Release command'),
    releaseArgs: z.string().describe('Release arguments')
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
