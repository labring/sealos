import { z } from 'zod';

// Request body schema for creating an instance
export const CreateInstanceRequestSchema = z.object({
  name: z
    .string()
    .describe(
      'Instance name. 1–63 lowercase alphanumeric characters or hyphens, must start and end with alphanumeric (Kubernetes DNS subdomain rules). e.g. "my-perplexica-instance"'
    ),
  template: z
    .string()
    .describe(
      'Template name from the catalog. Use GET /templates to list available templates. e.g. "perplexica"'
    ),
  args: z
    .object({})
    .catchall(z.string().describe('Template variable value'))
    .describe(
      'Template variable key-value pairs. Only args without a default value are required. Use GET /templates/{name} to see which args are required and their defaults.'
    )
    .optional()
});

// Quota schema for resources with compute/storage requirements
export const InstanceResourceQuotaSchema = z.object({
  cpu: z.number().optional().describe('CPU cores'),
  memory: z.number().optional().describe('Memory in GiB'),
  storage: z.number().optional().describe('Storage in GiB'),
  replicas: z.number().optional().describe('Number of replicas')
});

// Resource schema for sub-resources
export const ResourceSchema = z.object({
  name: z.string().describe('Resource name'),
  uid: z.string().describe('Kubernetes UID'),
  resourceType: z.string().describe('Resource type (lowercase k8s kind)'),
  quota: InstanceResourceQuotaSchema.describe(
    'Resource quota (for Deployment/StatefulSet/Cluster)'
  ).optional()
});

// Instance response schema
export const InstanceSchema = z.object({
  name: z.string().describe('Instance name (matches the name specified in the request)'),
  uid: z.string().describe('Kubernetes UID of the Instance resource'),
  resourceType: z.literal('instance').describe('Always "instance"'),
  displayName: z.string().describe('Display name'),
  createdAt: z.string().describe('ISO 8601 creation timestamp'),
  args: z
    .object({})
    .catchall(z.string().describe('Template variable value'))
    .describe('Resolved template arguments after merging user-provided values with defaults'),
  resources: z.array(ResourceSchema).describe('Sub-resources created for this instance').optional()
});

export const requestBody = CreateInstanceRequestSchema;

export const response = InstanceSchema;

export type CreateInstanceRequest = z.infer<typeof CreateInstanceRequestSchema>;
export type Instance = z.infer<typeof InstanceSchema>;
export type InstanceResource = z.infer<typeof ResourceSchema>;
export type InstanceResourceQuota = z.infer<typeof InstanceResourceQuotaSchema>;
