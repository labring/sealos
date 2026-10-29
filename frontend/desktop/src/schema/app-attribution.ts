import { z } from 'zod';

export const ACQUISITION_COOKIE = 'sealos_acquisition_v1';
const permission = z.enum(['granted', 'denied', 'unspecified']);
const label = z
  .string()
  .max(100)
  .regex(/^[^\u0000-\u001f\u007f]*$/);
const safeUrl = z
  .string()
  .max(250)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      );
    } catch {
      return false;
    }
  });
export const AcquisitionSchema = z.object({
  version: z.literal(1),
  realm: z.enum(['china', 'global']),
  visitor_id: z.string().uuid(),
  consent: z.object({
    analytics_storage: z.literal('granted'),
    ad_storage: permission,
    ad_user_data: permission,
    ad_personalization: permission
  }),
  source: z
    .object({
      source: label.optional(),
      medium: label.optional(),
      campaign: label.optional(),
      landing_page: safeUrl.optional(),
      referrer: safeUrl.optional(),
      timestamp: z
        .union([z.string().max(40).datetime(), z.number().finite().nonnegative()])
        .optional()
    })
    .optional(),
  platform_ids: z
    .object({
      ga_client_id: z
        .string()
        .regex(/^\d{1,20}\.\d{1,20}$/)
        .optional(),
      rybbit_user_id: z
        .string()
        .max(128)
        .regex(/^[A-Za-z0-9_.:-]+$/)
        .optional()
    })
    .optional(),
  sea_attr: z
    .string()
    .max(512)
    .regex(/^[A-Za-z0-9_-]+={0,2}$/)
    .optional()
});
export const AppAnalyticsContextSchema = AcquisitionSchema.extend({
  subject_id: z.string().uuid(),
  installation_id: z
    .string()
    .regex(/^install-[a-f0-9]{32}$/)
    .optional()
});
export type Acquisition = z.infer<typeof AcquisitionSchema>;
export type AppAnalyticsContext = z.infer<typeof AppAnalyticsContextSchema>;

/** Cookies are browser observations, never verified advertising consent or authentication. */
export function readAcquisitionCookie(
  raw: unknown,
  realm: Acquisition['realm']
): Acquisition | undefined {
  try {
    if (typeof raw !== 'string' || raw.length > 2400 || !/^[A-Za-z0-9_-]+$/.test(raw)) return;
    const bytes = Buffer.from(raw, 'base64url');
    if (bytes.length > 1800 || bytes.toString('base64url') !== raw) return;
    const result = AcquisitionSchema.safeParse(JSON.parse(bytes.toString('utf8')));
    if (!result.success || result.data.realm !== realm) return;
    const data = result.data;
    if (
      ![data.consent.ad_storage, data.consent.ad_user_data, data.consent.ad_personalization].every(
        (value) => value === 'granted'
      )
    )
      delete data.sea_attr;
    return data;
  } catch {
    return;
  }
}
