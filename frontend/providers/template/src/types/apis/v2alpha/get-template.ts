import {
  ResourceQuotaSchema,
  LanguageQuerySchema,
  TemplateNamePathSchema,
  TemplateBaseSchema
} from './common/schema';

export const pathParams = TemplateNamePathSchema;

export const queryParams = LanguageQuerySchema;

export const TemplateResourceSchema = ResourceQuotaSchema;

export const TemplateDetailSchema = TemplateBaseSchema.extend({
  quota: TemplateResourceSchema.describe('Calculated resource requirements')
});

/** Response is the template detail object directly (no code/data wrapper). */
export const response = TemplateDetailSchema;

export type ResourceType = z.infer<typeof TemplateResourceSchema>;
export type TemplateDetailType = z.infer<typeof TemplateDetailSchema>;
