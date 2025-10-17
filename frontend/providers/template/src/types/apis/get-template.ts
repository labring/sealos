import { z } from 'zod';

/**
 * Path parameters for template detail endpoint
 */
export const pathParams = z.object({
  name: z.string().describe('Template name identifier (e.g., "perplexica", "yourls")')
});

/**
 * Query parameters for template detail endpoint
 */
export const queryParams = z.object({
  language: z
    .string()
    .optional()
    .describe('Language code for internationalization (e.g., "en", "zh"). Defaults to "en"')
});

/**
 * Resource requirements schema
 * Values can be either a single number or a range with min/max
 */
export const ResourceSchema = z.object({
  cpu: z
    .union([z.number(), z.object({ min: z.number(), max: z.number() })])
    .nullable()
    .describe('Required CPU in cores (e.g., 1 or {min: 0.5, max: 2})'),
  memory: z
    .union([z.number(), z.object({ min: z.number(), max: z.number() })])
    .nullable()
    .describe('Required memory in GiB (e.g., 2.25 or {min: 1, max: 4})'),
  storage: z
    .union([z.number(), z.object({ min: z.number(), max: z.number() })])
    .nullable()
    .describe('Required storage in GiB (e.g., 2 or {min: 1, max: 10})'),
  nodeport: z.number().describe('Number of NodePort services required')
});

/**
 * Complete template detail schema (includes resource calculation)
 */
export const TemplateDetailSchema = z.object({
  name: z.string().describe('Unique template identifier'),
  uid: z.string().describe('Template unique ID'),
  resourceType: z.string().describe('Resource type, always "template"'),
  resource: ResourceSchema.nullable().describe(
    'Dynamically calculated resource requirements (null if calculation fails)'
  ),
  readme: z.string().describe('URL to README documentation'),
  icon: z.string().describe('URL to template icon image'),
  description: z.string().describe('Brief description of the template'),
  gitRepo: z.string().describe('Git repository URL'),
  category: z.array(z.string()).describe('Template categories (e.g., ["ai", "database"])'),
  input: z
    .record(z.string(), z.any())
    .describe('Input parameters required for template deployment'),
  deployCount: z.number().describe('Number of deployments (includes multiplier for display)')
});

/**
 * Response schema for template detail endpoint
 */
export const response = z.object({
  code: z.number().describe('HTTP status code (200 for success, 404/500 for error)'),
  data: TemplateDetailSchema.optional().describe('Template details (present on success)'),
  message: z.string().optional().describe('Error message (present on failure)'),
  error: z.any().optional().describe('Detailed error information (present on failure)')
});

export type ResourceType = z.infer<typeof ResourceSchema>;
export type TemplateDetailType = z.infer<typeof TemplateDetailSchema>;
