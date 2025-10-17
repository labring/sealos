import { z } from 'zod';

/**
 * Query parameters for listing templates
 */
export const queryParams = z.object({
  language: z
    .string()
    .optional()
    .describe('Language code for internationalization (e.g., "en", "zh"). Defaults to "en"')
});

/**
 * Template item schema (simplified, without resource calculation)
 */
export const TemplateItemSchema = z.object({
  name: z.string().describe('Unique template identifier'),
  uid: z.string().describe('Template unique ID'),
  resourceType: z.string().describe('Resource type, always "template"'),
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
 * Response schema for list templates endpoint
 */
export const response = z.object({
  code: z.number().describe('HTTP status code (200 for success, 500 for error)'),
  data: z
    .object({
      templates: z.array(TemplateItemSchema).describe('Array of template items'),
      menuKeys: z
        .string()
        .describe('Comma-separated top categories for menu (e.g., "ai,database,tool")')
    })
    .optional()
    .describe('Response data (present on success)'),
  message: z.string().optional().describe('Error message (present on failure)'),
  error: z.any().optional().describe('Detailed error information (present on failure)')
});

export type TemplateItemType = z.infer<typeof TemplateItemSchema>;
