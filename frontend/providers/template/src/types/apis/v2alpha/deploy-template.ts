import { z } from 'zod';
import { InstanceResourceQuotaSchema, ResourceSchema, InstanceSchema } from './create-instance';

// Request body schema for deploying a template from raw YAML
export const DeployTemplateRequestSchema = z.object({
  yaml: z
    .string()
    .describe(
      'Full template YAML string. Must start with a `kind: Template` document, followed by one or more `---`-separated Kubernetes resource documents.'
    ),
  args: z
    .object({})
    .catchall(z.string().describe('Template variable value'))
    .describe(
      'Template variable key-value pairs that override or supply `spec.inputs` fields. Only args without a non-empty default are required.'
    )
    .optional(),
  dryRun: z
    .boolean()
    .describe(
      'If true, validates the resources against the Kubernetes API but does not create anything. Returns 200 with a preview. Default: false.'
    )
    .optional()
});

// Dry-run preview response
export const DeployTemplateDryRunResponseSchema = z.object({
  name: z.string().describe('Auto-generated instance name from ${{ random(8) }} in spec.defaults'),
  resourceType: z.literal('instance').describe('Always "instance"'),
  dryRun: z.literal(true).describe('Always true for dry-run responses'),
  args: z
    .object({})
    .catchall(z.string())
    .describe('Resolved template arguments after merging user-provided values with defaults'),
  resources: z
    .array(ResourceSchema)
    .describe('Preview of sub-resources that would be created (Instance resource excluded)')
    .optional()
});

// Full deploy response (201) — same shape as createInstance response
export const DeployTemplateResponseSchema = InstanceSchema;

export const requestBody = DeployTemplateRequestSchema;
export const dryRunResponse = DeployTemplateDryRunResponseSchema;
export const response = DeployTemplateResponseSchema;

export type DeployTemplateRequest = z.infer<typeof DeployTemplateRequestSchema>;
export type DeployTemplateDryRunResponse = z.infer<typeof DeployTemplateDryRunResponseSchema>;
export type DeployTemplateResponse = z.infer<typeof DeployTemplateResponseSchema>;
