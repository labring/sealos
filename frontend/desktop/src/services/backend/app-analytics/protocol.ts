import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

const dimensionId = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._:/-]+$/);
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
    installation_id: z.string().regex(/^(install-[a-f0-9]{32}|event-[a-f0-9-]{36})$/),
    session_id: z
      .string()
      .regex(/^[1-9]\d{0,15}$/)
      .optional(),
    analytics_consent: z.enum(['granted', 'denied']),
    detailed: z.boolean(),
    properties: z
      .object({
        screen_name: z
          .string()
          .max(100)
          .regex(/^[a-z][a-z_.]*$/)
          .optional(),
        outcome: z.enum(['success', 'failed', 'cancelled']).optional(),
        reason: z
          .enum([
            'startup',
            'expired',
            'region_switch',
            'start',
            'timeout',
            'denied',
            'network',
            'exchange'
          ])
          .optional(),
        workspace_id: dimensionId.optional(),
        duration_ms: z.number().int().nonnegative().max(86400_000).optional(),
        engagement_time_msec: z.number().int().nonnegative().max(86400_000).optional(),
        app_version: z
          .string()
          .max(64)
          .regex(/^[0-9A-Za-z.+-]+$/)
          .optional(),
        os: z.enum(['macos', 'windows', 'linux']).optional(),
        arch: z
          .string()
          .max(32)
          .regex(/^[a-z0-9_]+$/)
          .optional(),
        env: z.enum(['production', 'test', 'development']).optional(),
        packaged: z.boolean().optional(),
        flow: z.enum(['device_grant', 'authorization_code']).optional(),
        method: z.enum(['template', 'database', 'app']).optional(),
        service_kind: z.enum(['project', 'db', 'app']).optional(),
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

export function installationClientId(installationId: string): string {
  const digest = createHash('sha256').update(`sealos-native-v1:${installationId}`).digest();
  return `${digest.readUInt32BE(0) || 1}.${digest.readUInt32BE(4) || 1}`;
}

export function toMeasurementEvent(event: AppEvent, userUid?: string) {
  const {
    workspace_id: _workspace,
    engagement_time_msec: _engagement,
    ...basic
  } = event.properties;
  return {
    client_id: installationClientId(event.detailed ? event.installation_id : randomUUID()),
    ...(event.detailed && userUid ? { user_id: userUid } : {}),
    timestamp_micros: new Date(event.occurred_at).getTime() * 1000,
    consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
    events: [
      {
        name: event.event_name === 'screen_view' ? 'app_screen_view' : event.event_name,
        params: {
          ...(event.detailed ? event.properties : basic),
          event_id: event.event_id,
          surface: 'desktop_app',
          product_edition: 'global',
          detailed: event.detailed,
          ...(event.detailed && event.session_id ? { session_id: event.session_id } : {})
        }
      }
    ]
  };
}
