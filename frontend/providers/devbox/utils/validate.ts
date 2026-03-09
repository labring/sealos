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
  icon: z.string().nullable().optional(),
  isPublic: z.boolean().default(false),
  devboxReleaseName: z.string()
});
export const updateTemplateRepositorySchema = z.object({
  uid: z.string().uuid(),
  templateRepositoryName: z.string().min(1).max(255),
  description: z.string().max(255),
  tagUidList: z.string().uuid().array().default([]),
  icon: z.string().nullable().optional(),
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

const ZIP_MAGIC_BYTES = [0x50, 0x4b, 0x03, 0x04];

const TEMPLATE_ICON_MAX_BYTES = 64 * 1024;
const SVG_PREFIX_RE = /^<svg[\s>]/i;
const SVG_UNSAFE_PATTERNS = [/<script[\s>]/i, /on\w+\s*=/i, /foreignobject/i, /javascript:/i];

export const normalizeTemplateIcon = (icon?: string | null): string | null => {
  if (!icon) return null;
  const trimmed = icon.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const validateTemplateIcon = (icon?: string | null) => {
  const normalized = normalizeTemplateIcon(icon);
  if (!normalized) {
    return { ok: true, value: null as string | null };
  }
  if (Buffer.byteLength(normalized, 'utf8') > TEMPLATE_ICON_MAX_BYTES) {
    return { ok: false, error: 'icon is too large' };
  }
  if (SVG_PREFIX_RE.test(normalized)) {
    for (const pattern of SVG_UNSAFE_PATTERNS) {
      if (pattern.test(normalized)) {
        return { ok: false, error: 'icon svg contains unsafe content' };
      }
    }
    return { ok: true, value: normalized, kind: 'svg' as const };
  }
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:') {
      return { ok: false, error: 'icon url must use https' };
    }
  } catch {
    return { ok: false, error: 'icon must be svg content or https url' };
  }
  return { ok: true, value: normalized, kind: 'url' as const };
};

export function validateZipFile(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }

  for (let i = 0; i < ZIP_MAGIC_BYTES.length; i++) {
    if (buffer[i] !== ZIP_MAGIC_BYTES[i]) {
      return false;
    }
  }

  return true;
}
