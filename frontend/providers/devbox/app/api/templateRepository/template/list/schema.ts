import { z } from 'zod';

const TemplateSchema = z.object({
  uid: z.string().describe('Template Uid'),
  name: z.string().describe('Template name'),
  image: z.string().describe('Template image'),
  config: z.string().describe('Template configuration in JSON format'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export const RequestSchema = z.object({
  templateRepositoryUid: z.string().describe('Repository unique identifier to list templates from')
});

export const SuccessResponseSchema = z.object({
  data: z.array(TemplateSchema).describe('List of templates in the repository')
});
