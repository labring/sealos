import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const id = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._:/-]+$/);
const state = z.enum(['granted', 'denied', 'unspecified']).default('unspecified');
const sourceSchema = z
  .object({
    source: z.string().max(200).optional(),
    medium: z.string().max(200).optional(),
    campaign: z.string().max(200).optional(),
    landing_page: z.string().max(2048).optional(),
    referrer: z.string().max(2048).optional(),
    timestamp: z.string().max(64).optional()
  })
  .strict();
export const consentSchema = z
  .object({
    analytics_storage: state,
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state
  })
  .strict();
export const acquisitionContextSchema = z
  .object({
    version: z.literal(1),
    visitor_id: id.optional(),
    sea_attr: z.string().min(1).max(16384).optional(),
    source: z
      .object({
        source: z.string().max(200).optional(),
        medium: z.string().max(200).optional(),
        campaign: z.string().max(200).optional(),
        landing_page: z.string().max(2048).optional(),
        referrer: z.string().max(2048).optional(),
        timestamp: z.string().max(64).optional()
      })
      .strict()
      .optional(),
    activation_source: sourceSchema.optional(),
    last_source: sourceSchema.optional(),
    consent: consentSchema,
    platform_ids: z
      .object({ ga_client_id: id.optional(), rybbit_user_id: id.optional() })
      .strict()
      .optional()
  })
  .strict();
export type AcquisitionContext = z.infer<typeof acquisitionContextSchema>;
export const appEventSchema = z
  .object({
    version: z.literal(1),
    event_id: z.string().uuid(),
    event_name: z.enum([
      'app_launch',
      'app_first_open',
      'screen_view',
      'app_screen_view',
      'login_required',
      'login_started',
      'login_succeeded',
      'login_failed',
      'task_created',
      'task_opened',
      'deploy_finished'
    ]),
    occurred_at: z.string().datetime(),
    surface: z.literal('desktop_app'),
    product_edition: z.literal('global'),
    installation_id: id,
    session_id: z.string().regex(/^\d+$/).max(20).optional(),
    analytics_consent: z.enum(['granted', 'denied']),
    detailed: z.boolean(),
    properties: z
      .object({
        screen_name: z.string().max(100).optional(),
        outcome: z.string().max(40).optional(),
        reason: z.string().max(80).optional(),
        workspace_id: id.optional(),
        duration_ms: z.number().nonnegative().max(86400_000).optional(),
        engagement_time_msec: z.number().nonnegative().max(86400_000).optional(),
        app_version: z.string().max(80).optional(),
        os: z.string().max(24).optional(),
        arch: z.string().max(24).optional(),
        env: z.string().max(24).optional(),
        packaged: z.boolean().optional(),
        flow: z.string().max(40).optional(),
        method: z.string().max(40).optional(),
        service_kind: z.string().max(80).optional(),
        template_id: z
          .string()
          .max(64)
          .regex(/^(custom|[A-Za-z0-9][A-Za-z0-9 ._-]{0,63})$/)
          .optional()
      })
      .strict()
      .default({})
  })
  .strict();
export type AppEvent = z.infer<typeof appEventSchema>;
export const lifecycleSchema = z
  .object({
    version: z.literal(1),
    event_id: z.string().min(1).max(200),
    event_name: z.enum([
      'signup',
      'build_started',
      'deploy_success',
      'topup_success',
      'subscribe_success'
    ]),
    occurred_at: z.string().datetime(),
    subject_id: z.string().uuid(),
    acquisition_request_id: z.string().uuid().optional(),
    realm: z.enum(['china', 'global']).optional(),
    workspace_id: id.optional(),
    transaction_id: id.optional(),
    properties: z
      .object({
        value: z.number().nonnegative().optional(),
        currency: z
          .string()
          .regex(/^[A-Z]{3}$/)
          .optional(),
        plan: z.string().max(100).optional(),
        method: z.string().max(40).optional(),
        deployment_id: id.optional(),
        actor_id: id.optional(),
        paying_account_id: id.optional()
      })
      .strict()
      .default({})
  })
  .strict();

export function toMeasurementEvent(event: AppEvent, userUid?: string) {
  // A minimal event is not a persistent anonymous profile, even if a caller errs.
  const detailed = event.detailed;
  const {
    workspace_id: _workspace,
    engagement_time_msec: _engagement,
    ...minimalProperties
  } = event.properties;
  return {
    client_id: detailed ? event.installation_id : randomUUID(),
    ...(detailed && userUid ? { user_id: userUid } : {}),
    timestamp_micros: new Date(event.occurred_at).getTime() * 1000,
    consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
    events: [
      {
        name: event.event_name === 'screen_view' ? 'app_screen_view' : event.event_name,
        params: {
          ...(detailed ? event.properties : minimalProperties),
          event_id: event.event_id,
          surface: 'desktop_app',
          product_edition: 'global',
          detailed,
          ...(detailed && event.session_id ? { session_id: event.session_id } : {})
        }
      }
    ]
  };
}
