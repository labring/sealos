import { z } from 'zod';
import { TemplateInputSchema, TemplateNamePathSchema, BaseResponseSchema } from './common/schema';
export const TemplateArgSchema = TemplateInputSchema;
export const TemplateCreateSchema = z.object({
  name: z.string().describe('Template name'),
  args: z.record(z.string(), TemplateArgSchema).describe('Template arguments configuration')
});

export const pathParams = TemplateNamePathSchema;

export const requestBody = z
  .record(z.string(), z.string())
  .describe(
    'Template variable values (key-value pairs for template arguments, sent directly without "args" wrapper)'
  );

export const TemplateDeploymentSchema = z.object({
  instanceName: z.string().describe('Name of the created instance'),
  namespace: z.string().describe('Namespace where the instance was deployed'),
  status: z.string().describe('Deployment status'),
  resources: z.array(z.string()).describe('List of created Kubernetes resource types')
});

export const response = BaseResponseSchema.extend({
  code: z.number().describe('HTTP status code (200 for success, 400/401/404/500 for error)'),
  data: TemplateDeploymentSchema.optional().describe('Deployment result (present on success)')
});

export type TemplateDeploymentType = z.infer<typeof TemplateDeploymentSchema>;
export type CreateTemplateRequestType = z.infer<typeof requestBody>;
export type TemplateArgType = z.infer<typeof TemplateArgSchema>;
export type TemplateCreateType = z.infer<typeof TemplateCreateSchema>;
