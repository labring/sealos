import { z } from 'zod';
import {
  ResourceQuotaSchema,
  LanguageQuerySchema,
  TemplateNamePathSchema,
  TemplateBaseSchema,
  BaseResponseSchema
} from './common/schema';

export const pathParams = TemplateNamePathSchema;

export const queryParams = LanguageQuerySchema;

export const TemplateResourceSchema = ResourceQuotaSchema;

export const TemplateDetailSchema = TemplateBaseSchema.extend({
  quota: TemplateResourceSchema.describe('Calculated resource requirements')
});

export const response = BaseResponseSchema.extend({
  code: z.number().describe('HTTP status code (200 for success, 404/500 for error)'),
  data: TemplateDetailSchema.optional().describe('Template details (present on success)')
});

export type ResourceType = z.infer<typeof TemplateResourceSchema>;
export type TemplateDetailType = z.infer<typeof TemplateDetailSchema>;
