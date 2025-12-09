import { z } from 'zod';

export const TemplateInputSchema = z.object({
  description: z.string().describe('Human-readable explanation of the argument'),
  type: z.enum(['string', 'number', 'boolean']).describe('Argument type'),
  default: z.string().describe('Default value used during deployment'),
  required: z.boolean().describe('Whether this argument is mandatory')
});

export const ResourceQuotaSchema = z.object({
  cpu: z.number().describe('Required CPU cores in vCPU'),
  memory: z.number().describe('Required memory in GiB'),
  storage: z.number().describe('Required storage in GiB'),
  nodeport: z.number().describe('Number of NodePort services required')
});

export const LanguageQuerySchema = z.object({
  language: z
    .string()
    .optional()
    .describe('Language code for internationalization (e.g., "en", "zh"). Defaults to "en"')
});

export const TemplateNamePathSchema = z.object({
  name: z.string().describe('Template name identifier (e.g., "perplexica", "yourls")')
});

export const InstanceNamePathSchema = z.object({
  instanceName: z
    .string()
    .describe('Name of the deployed template instance to delete (must exist in user namespace)')
});

export const TemplateBaseSchema = z.object({
  name: z.string().describe('Unique template identifier'),
  resourceType: z.literal('template').describe('Resource type, always "template"'),
  readme: z.string().url().describe('URL to README documentation'),
  icon: z.string().url().describe('URL to template icon image'),
  description: z.string().describe('Brief description of the template'),
  gitRepo: z.string().url().describe('Git repository URL'),
  category: z.array(z.string()).describe('Template categories (e.g., ["ai", "database"])'),
  args: z
    .record(z.string(), TemplateInputSchema)
    .describe('Arguments required for template deployment'),
  deployCount: z.number().describe('Number of deployments (includes multiplier for display)')
});

export const BaseResponseSchema = z.object({
  code: z.number().describe('HTTP status code'),
  data: z.any().optional().describe('Response data (present on success)'),
  message: z.string().optional().describe('Success or error message'),
  error: z.any().optional().describe('Detailed error information (present on failure)')
});

export type TemplateInput = z.infer<typeof TemplateInputSchema>;
export type ResourceQuota = z.infer<typeof ResourceQuotaSchema>;
export type TemplateBase = z.infer<typeof TemplateBaseSchema>;
export type BaseResponse = z.infer<typeof BaseResponseSchema>;
