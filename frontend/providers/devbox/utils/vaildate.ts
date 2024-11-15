import { z } from "zod";

export const versionSchema = z.string().regex(/[\w][\w.-]{0,127}/);
export const nameSchema = z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);

export const createTemplateRepositorySchema = z.object({
  description: z.string().max(255),
  version: z.string().min(1).max(255),
  tagUidList: z.string().uuid().array().default([]),
  templateRepositoryName: z.string().min(1).max(255),
  isPublic: z.boolean().default(false),
  devboxReleaseName: z.string(),
})
export const updateTemplateRepositorySchema = z.object({
  uid: z.string().uuid(),
  templateRepositoryName: z.string().min(1).max(255),
  description: z.string().max(255),
  versionList: z.string().array(), // uid[]
  tagUidList: z.string().uuid().array().default([]),
  isPublic: z.boolean().default(false),
})
export const updateTemplateSchema = z.object({
  templateRepositoryUid: z.string().uuid(),
  description: z.string().max(255),
  version: z.string(),
  tagUidList: z.string().uuid().array().default([]),
  devboxReleaseName: z.string(),
})
export type CreateTemplateRepositoryType = z.infer<typeof createTemplateRepositorySchema>
export type UpdateTemplateRepositoryType = z.infer<typeof updateTemplateRepositorySchema>
export type UpdateTemplateType = z.infer<typeof updateTemplateSchema>