import { z } from 'zod';

export const ReleaseFormSchema = z.object({
  devboxName: z.string().min(1).describe('Devbox name'),
  tag: z.string().min(1).describe('Release tag'),
  releaseDes: z.string().default('').describe('Release description'),
  devboxUid: z.string().min(1).describe('Devbox UID')
});

export const RequestSchema = z.object({
  devboxForm: ReleaseFormSchema
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success')
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  error: z.any().optional()
});
