import { z } from 'zod';
import { LanguageQuerySchema, TemplateBaseSchema, BaseResponseSchema } from './common/schema';

export const queryParams = LanguageQuerySchema;

export const TemplateItemSchema = TemplateBaseSchema;

export const response = z
  .array(TemplateItemSchema)
  .describe('Array of template items (returned directly without wrapper object)');

export type TemplateItemType = z.infer<typeof TemplateItemSchema>;
