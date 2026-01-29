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

// Quota schema for resources with compute/storage requirements
export const InstanceResourceQuotaSchema = z.object({
  cpu: z.number().describe('CPU cores'),
  memory: z.number().describe('Memory in GiB'),
  storage: z.number().describe('Storage in GiB'),
  replicas: z.number().describe('Number of replicas')
});

// Resource schema for sub-resources
export const ResourceSchema = z.object({
  name: z.string().describe('Resource name'),
  uid: z.string().describe('Kubernetes UID'),
  resourceType: z.string().describe('Resource type (lowercase k8s kind)'),
  quota: InstanceResourceQuotaSchema.optional().describe(
    'Resource quota (for Deployment/StatefulSet/Cluster)'
  )
});

// Instance response schema
export const InstanceSchema = z.object({
  name: z.string().describe('Instance name'),
  uid: z.string().describe('Kubernetes UID of instance resource'),
  resourceType: z.literal('instance').describe('Resource type'),
  displayName: z.string().describe('Display name'),
  createdAt: z.string().describe('Creation timestamp'),
  args: z.record(z.string(), z.string()).describe('Template arguments'),
  resources: z.array(ResourceSchema).describe('Created sub-resources')
});

export const requestBody = CreateInstanceRequestSchema;

export const response = InstanceSchema;

export const errorResponse = BaseResponseSchema.extend({
  code: z.number().describe('HTTP error code (400/401/404/500)')
});

export type CreateInstanceRequest = z.infer<typeof CreateInstanceRequestSchema>;
export type Instance = z.infer<typeof InstanceSchema>;
export type InstanceResource = z.infer<typeof ResourceSchema>;
export type InstanceResourceQuota = z.infer<typeof InstanceResourceQuotaSchema>;
