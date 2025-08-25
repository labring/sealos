import { z } from 'zod';
export enum versionErrorEnum {
  INVALID_VERSION = 'INVALID_VERSION'
}
export const versionSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/[\w][\w.-]{0,127}/, {
    message: versionErrorEnum.INVALID_VERSION
  });
export const templateNameSchema = z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);
export const devboxNameSchema = z.string().regex(/^[a-z]([-a-z0-9]*[a-z0-9])?$/);
export const createTemplateRepositorySchema = z.object({
  description: z.string().max(255),
  version: z.string().min(1).max(255),
  tagUidList: z.string().uuid().array().default([]),
  templateRepositoryName: z.string().min(1).max(255),
  isPublic: z.boolean().default(false),
  devboxReleaseName: z.string()
});
export const updateTemplateRepositorySchema = z.object({
  uid: z.string().uuid(),
  templateRepositoryName: z.string().min(1).max(255),
  description: z.string().max(255),
  tagUidList: z.string().uuid().array().default([]),
  isPublic: z.boolean().default(false)
});
export const updateTemplateSchema = z.object({
  templateRepositoryUid: z.string().uuid(),
  description: z.string().max(255),
  version: z.string(),
  tagUidList: z.string().uuid().array().default([]),
  devboxReleaseName: z.string()
});
export const updateTemplateListSchema = z.object({
  uid: z.string().uuid(),
  versionList: z.string().array() // uid[]
});
export type CreateTemplateRepositoryType = z.infer<typeof createTemplateRepositorySchema>;
export type UpdateTemplateRepositoryType = z.infer<typeof updateTemplateRepositorySchema>;
export type UpdateTemplateListType = z.infer<typeof updateTemplateListSchema>;
export type UpdateTemplateType = z.infer<typeof updateTemplateSchema>;
