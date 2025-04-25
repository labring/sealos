import { z } from 'zod';

const TemplateSchema = z.object({
  uid: z.string().describe('Template unique identifier'),
  name: z.string().describe('Template name'),
  image: z.string().describe('Template image'),
  config: z.string().describe('Template configuration in JSON format'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export const RequestSchema = z.object({
  repositoryUid: z.string().describe('Repository unique identifier to list templates from')
});

export const HeaderSchema = z.object({
  ['Authorization-Bearer']: z.string().describe('Authorization token')
});

export const SuccessResponseSchema = z.object({
  data: z.array(TemplateSchema).describe('List of templates in the repository')
});
