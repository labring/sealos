import { appEventSchema, toMeasurementEvent } from '@/services/backend/acquisition/protocol';

const envelope = {
  version: 1,
  event_id: '0a675cb4-0652-4470-a7b1-fd4b1a759213',
  occurred_at: '2026-10-29T01:00:00.000Z',
  surface: 'desktop_app',
  product_edition: 'global',
  installation_id: `install-${'a'.repeat(32)}`,
  session_id: '1793235600000',
  analytics_consent: 'granted',
  detailed: true
};

describe('actual desktop App wire compatibility', () => {
  it.each([
    ['app_first_open', {}],
    [
      'app_launch',
      {
        app_version: '0.10.2-beta.1',
        os: 'macos',
        arch: 'arm64',
        env: 'production',
        packaged: true
      }
    ],
    [
      'app_screen_view',
      { screen_name: 'workspace.chat', engagement_time_msec: 123, workspace_id: 'ns-example' }
    ],
    ['login_started', { flow: 'authorization_code' }],
    ['login_succeeded', { flow: 'authorization_code', duration_ms: 1000 }],
    ['login_failed', { flow: 'authorization_code', reason: 'exchange', duration_ms: 1000 }],
    [
      'deploy_finished',
      {
        outcome: 'success',
        method: 'template',
        service_kind: 'project',
        template_id: 'Uptime Kuma',
        duration_ms: 1000
      }
    ]
  ])(
    'accepts the existing App %s event and its bounded product properties',
    (event_name, properties) => {
      const parsed = appEventSchema.safeParse({ ...envelope, event_name, properties });
      expect(parsed.success).toBe(true);
    }
  );

  it('keeps minimal App screen events outside persistent identity / session attribution', () => {
    const event = appEventSchema.parse({
      ...envelope,
      event_name: 'app_screen_view',
      detailed: false,
      installation_id: 'event-866fc31e-1564-43d9-a52a-1795a448b940',
      session_id: undefined,
      properties: { screen_name: 'workspace.chat' }
    });
    const measurement = toMeasurementEvent(event, 'a-trusted-user');
    expect(measurement).not.toHaveProperty('user_id');
    expect(measurement.events[0].params).not.toHaveProperty('session_id');
    expect(measurement.client_id).not.toBe(event.installation_id);
  });
});
