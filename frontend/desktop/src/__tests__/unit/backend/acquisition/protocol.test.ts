import {
  acquisitionContextSchema,
  appEventSchema,
  toMeasurementEvent
} from '@/services/backend/acquisition/protocol';
import websiteFixtures from './website-wire-fixtures.json';

const event = {
  version: 1,
  event_id: 'c64a1855-8464-4a37-a40f-5c18ba092e81',
  event_name: 'screen_view',
  occurred_at: '2026-10-29T00:00:00.000Z',
  surface: 'desktop_app',
  product_edition: 'global',
  installation_id: 'install-example',
  session_id: '123456',
  analytics_consent: 'granted',
  detailed: true,
  properties: { screen_name: 'home' }
};

describe('native analytics wire contract', () => {
  it.each(websiteFixtures)(
    'accepts the actual $realm website handoff with separate first/activation sources',
    (fixture) => {
      const result = acquisitionContextSchema.parse(fixture.context);
      expect(result.source?.campaign).toBe('A');
      expect(result.activation_source?.campaign).toBe('B');
      expect(result.last_source?.campaign).toBe('B');
      expect(result.visitor_id).toBeTruthy();
    }
  );
  it('maps a real App screen without impersonating a web page', () => {
    const result = toMeasurementEvent(appEventSchema.parse(event), 'trusted-user');
    expect(result).toMatchObject({
      client_id: 'install-example',
      user_id: 'trusted-user',
      events: [
        {
          name: 'app_screen_view',
          params: { screen_name: 'home', session_id: '123456', surface: 'desktop_app' }
        }
      ]
    });
  });
  it('rejects forged identity, arbitrary properties and client-side payment facts', () => {
    expect(appEventSchema.safeParse({ ...event, user_id: 'forged' }).success).toBe(false);
    expect(appEventSchema.safeParse({ ...event, properties: { email: 'private' } }).success).toBe(
      false
    );
    expect(appEventSchema.safeParse({ ...event, event_name: 'topup_success' }).success).toBe(false);
  });
  it('does not bind anonymous minimal telemetry to an account or session', () => {
    const result = toMeasurementEvent(
      appEventSchema.parse({ ...event, detailed: false }),
      'trusted-user'
    );
    expect(result).not.toHaveProperty('user_id');
    expect(result.events[0].params).not.toHaveProperty('session_id');
    expect(result.client_id).not.toBe(event.installation_id);
  });
  it('rejects free-form tracking fields and oversized source contexts', () => {
    expect(
      acquisitionContextSchema.safeParse({
        version: 1,
        visitor_id: 'v',
        consent: { analytics_storage: 'granted' },
        token: 'secret'
      }).success
    ).toBe(false);
    expect(
      acquisitionContextSchema.safeParse({
        version: 1,
        visitor_id: 'v',
        sea_attr: 'x'.repeat(16385),
        consent: { analytics_storage: 'granted' }
      }).success
    ).toBe(false);
  });
});
