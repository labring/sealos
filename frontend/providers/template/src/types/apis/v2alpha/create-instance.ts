import { z } from 'zod';

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
  resources: z.array(ResourceSchema).optional().describe('Created sub-resources')
});

export const requestBody = CreateInstanceRequestSchema;

export const response = InstanceSchema;

// Error response schema
export const errorResponse = z.object({
  message: z.string().describe('Error message'),
  error: z.any().optional().describe('Detailed error information')
});

export type CreateInstanceRequest = z.infer<typeof CreateInstanceRequestSchema>;
export type Instance = z.infer<typeof InstanceSchema>;
export type InstanceResource = z.infer<typeof ResourceSchema>;
export type InstanceResourceQuota = z.infer<typeof InstanceResourceQuotaSchema>;
