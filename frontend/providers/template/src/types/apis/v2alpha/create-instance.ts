import { z } from 'zod';
import { BaseResponseSchema, TemplateInputSchema } from './common/schema';

// Request body schema for creating an instance
export const CreateInstanceRequestSchema = z.object({
  name: z.string().describe('Custom instance name'),
  template: z.string().describe('Template name to deploy'),
  args: z
    .record(z.string(), z.string())
    .optional()
    .describe('Template arguments (key-value pairs). Uses defaults for missing values.')
});

// Instance response schema
export const InstanceSchema = z.object({
  name: z.string().describe('Instance name'),
  namespace: z.string().describe('Kubernetes namespace'),
  template: z.string().describe('Template name'),
  createTime: z.string().describe('Creation timestamp'),
  icon: z.string().describe('Template icon URL'),
  description: z.string().describe('Template description'),
  gitRepo: z.string().describe('Git repository URL'),
  readme: z.string().describe('README URL'),
  author: z.string().describe('Template author'),
  categories: z.array(z.string()).describe('Template categories')
});

export const requestBody = CreateInstanceRequestSchema;

export const response = InstanceSchema;

export const errorResponse = BaseResponseSchema.extend({
  code: z.number().describe('HTTP error code (400/401/404/500)')
});

export type CreateInstanceRequest = z.infer<typeof CreateInstanceRequestSchema>;
export type Instance = z.infer<typeof InstanceSchema>;
