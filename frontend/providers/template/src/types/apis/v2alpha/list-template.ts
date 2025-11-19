import { z } from 'zod';
import { LanguageQuerySchema, TemplateBaseSchema, BaseResponseSchema } from './common/schema';

export const queryParams = LanguageQuerySchema;

export const TemplateItemSchema = TemplateBaseSchema;

export const response = BaseResponseSchema.extend({
  code: z.number().describe('HTTP status code (200 for success, 500 for error)'),
  data: z
    .object({
      templates: z.array(TemplateItemSchema).describe('Array of template items'),
      menuKeys: z
        .string()
        .describe('Comma-separated top categories for menu (e.g., "ai,database,tool")')
    })
    .optional()
    .describe('Response data (present on success)')
});

export type TemplateItemType = z.infer<typeof TemplateItemSchema>;
