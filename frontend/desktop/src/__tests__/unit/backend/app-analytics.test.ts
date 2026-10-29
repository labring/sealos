import { sign } from 'jsonwebtoken';
import { appEventSchema, toMeasurementEvent } from '@/services/backend/app-analytics/protocol';
import { createAppAnalyticsHandler } from '@/services/backend/app-analytics/handler';

vi.mock('@/pages/api/platform/getCloudConfig', () => ({ getCloudConfig: vi.fn() }));

const uid = '47edfe55-1522-477b-9854-c9f922342d49';
const secret = 'test-only-native-signing-key';
const event = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  event_id: '509ad38b-dfcc-453b-9bee-3d76987c78cc',
  event_name: 'app_launch',
  occurred_at: new Date().toISOString(),
  surface: 'desktop_app',
  product_edition: 'global',
  installation_id: `install-${'a'.repeat(32)}`,
  session_id: '1793250000',
  analytics_consent: 'granted',
  detailed: true,
  properties: { app_version: '0.10.2', os: 'macos', packaged: true },
  ...overrides
});
const request = (body = event(), headers: Record<string, string> = {}) =>
  ({
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    socket: { remoteAddress: '127.0.0.1' },
    body
  } as any);
function response() {
  const res: any = { code: 200, body: null, headers: {} };
  res.status = (value: number) => ((res.code = value), res);
  res.json = (value: unknown) => ((res.body = value), res);
  res.setHeader = (name: string, value: string) => ((res.headers[name] = value), res);
  return res;
}
const token = (claims: Record<string, unknown> = {}, options: any = {}) =>
  sign(
    { sub: uid, user_id: '10001', token_type: 'access_token', client_id: 'sealos-io', ...claims },
    secret,
    { expiresIn: '1h', ...options }
  );

beforeEach(() => {
  vi.stubEnv('APP_ANALYTICS_REALM', 'global');
  vi.stubEnv('APP_ANALYTICS_NATIVE_CLIENT_IDS', '');
  vi.stubEnv('GOOGLE_ANALYTICS_MEASUREMENT_ID', 'G-TEST12345');
  vi.stubEnv('GOOGLE_ANALYTICS_MP_API_SECRET', 'test-only-mp-secret');
  global.AppConfig = { desktop: { auth: { jwt: { global: secret } } } } as any;
});
afterEach(() => vi.unstubAllEnvs());

it('keeps one installation client ID across anonymous and authenticated events', () => {
  const body = appEventSchema.parse(event());
  const anonymous = toMeasurementEvent(body);
  const loggedIn = toMeasurementEvent(body, uid);
  expect(anonymous.client_id).toMatch(/^\d+\.\d+$/);
  expect(loggedIn.client_id).toBe(anonymous.client_id);
  expect(anonymous).not.toHaveProperty('user_id');
  expect(loggedIn.user_id).toBe(uid);
  expect(loggedIn.events[0].params.session_id).toBe(body.session_id);
  expect(loggedIn.timestamp_micros).toBe(new Date(body.occurred_at).getTime() * 1000);
});

it('strips all persistent identity dimensions from basic events on the server', () => {
  const body = appEventSchema.parse(
    event({
      detailed: false,
      properties: { workspace_id: 'workspace-1', engagement_time_msec: 8, os: 'macos' }
    })
  );
  const first = toMeasurementEvent(body, uid);
  const second = toMeasurementEvent(body, uid);
  expect(first.client_id).not.toBe(second.client_id);
  expect(first).not.toHaveProperty('user_id');
  expect(first.events[0].params).not.toHaveProperty('session_id');
  expect(first.events[0].params).not.toHaveProperty('workspace_id');
  expect(first.events[0].params).not.toHaveProperty('engagement_time_msec');
  expect(first.consent).toEqual({ ad_user_data: 'DENIED', ad_personalization: 'DENIED' });
});

it.each([
  { event_name: 'topup_success' },
  { event_name: 'deploy_success' },
  { event_name: 'signup' },
  { product_edition: 'china' },
  { user_id: uid },
  { sea_attr: 'opaque-marketing' },
  { properties: { email: 'private@example.invalid' } },
  { properties: { screen_name: 'file:///Users/private' } },
  { installation_id: 'user@example.invalid' },
  { properties: { workspace_id: 'a'.repeat(101) } }
])('rejects unsupported source or identity/marketing fields: %j', (overrides) => {
  expect(appEventSchema.safeParse(event(overrides)).success).toBe(false);
});

it.each([
  'workspace.chat',
  'workspace.automations.create',
  'service.gateway.keys',
  'settings.general',
  'inspector.overview'
])('accepts actual dotted App screen keys: %s', async (screen) => {
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 });
  const res = response();
  await createAppAnalyticsHandler({ fetchImpl })(
    request(event({ event_name: 'app_screen_view', properties: { screen_name: screen } })),
    res
  );
  expect(res.code).toBe(200);
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body).events[0].params.screen_name).toBe(screen);
});

it('forwards an anonymous event directly to the fixed MP endpoint without request headers', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 });
  const handler = createAppAnalyticsHandler({ fetchImpl });
  const res = response();
  await handler(request(), res);
  expect(res.code).toBe(200);
  expect(res.body).toEqual({ accepted: true, event_id: event().event_id });
  const [url, init] = fetchImpl.mock.calls[0];
  expect(new URL(url).origin).toBe('https://www.google-analytics.com');
  expect(new URL(url).pathname).toBe('/mp/collect');
  expect(new URL(url).searchParams.get('api_secret')).toBe('test-only-mp-secret');
  expect(init.redirect).toBe('error');
  expect(init.signal).toBeInstanceOf(AbortSignal);
  expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
  expect(JSON.parse(init.body)).not.toHaveProperty('user_id');
  expect(JSON.stringify(res)).not.toContain('test-only-mp-secret');
});

it('sets user_id only from the verified native access token', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 });
  const res = response();
  await createAppAnalyticsHandler({ fetchImpl })(
    request(event(), { authorization: `Bearer ${token()}` }),
    res
  );
  expect(res.code).toBe(200);
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body).user_id).toBe(uid);
});

it.each([
  () => 'forged',
  () => token({ token_type: 'refresh_token' }),
  () => token({ client_id: 'other-client' }),
  () => token({}, { expiresIn: -1 }),
  () => token({ sub: 'email@example.invalid' })
])('rejects invalid native authentication before contacting Google', async (makeToken) => {
  const fetchImpl = vi.fn();
  const res = response();
  await createAppAnalyticsHandler({ fetchImpl })(
    request(event(), { authorization: `Bearer ${makeToken()}` }),
    res
  );
  expect(res.code).toBe(401);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each(['', 'china', 'invalid'])(
  'does not contact Google in a disabled/non-Global deployment: %s',
  async (realm) => {
    vi.stubEnv('APP_ANALYTICS_REALM', realm);
    const fetchImpl = vi.fn();
    const res = response();
    await createAppAnalyticsHandler({ fetchImpl })(request(), res);
    expect(res.code).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  }
);

it.each(['GOOGLE_ANALYTICS_MEASUREMENT_ID', 'GOOGLE_ANALYTICS_MP_API_SECRET'])(
  'fails closed without %s',
  async (key) => {
    vi.stubEnv(key, '');
    const fetchImpl = vi.fn();
    const res = response();
    await createAppAnalyticsHandler({ fetchImpl })(request(), res);
    expect(res.code).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  }
);

it('never authenticates against the existing default JWT fallback', async () => {
  global.AppConfig = undefined as any;
  const fetchImpl = vi.fn();
  const res = response();
  await createAppAnalyticsHandler({ fetchImpl })(
    request(event(), { authorization: `Bearer ${token()}` }),
    res
  );
  expect(res.code).toBe(503);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each([
  ['GET', {}, 405],
  ['POST', { origin: 'null' }, 403],
  ['POST', { origin: 'https://sealos.io' }, 403],
  ['POST', { 'content-type': 'text/plain' }, 415]
])('rejects non-native or non-JSON requests %s %j', async (method, headers, expected) => {
  const fetchImpl = vi.fn();
  const res = response();
  await createAppAnalyticsHandler({ fetchImpl })(
    { ...request(event(), headers as any), method },
    res
  );
  expect(res.code).toBe(expected);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('does not forward denied events or detailed-only events in basic mode', async () => {
  const fetchImpl = vi.fn();
  const handler = createAppAnalyticsHandler({ fetchImpl });
  const denied = response();
  await handler(request(event({ analytics_consent: 'denied' })), denied);
  expect(denied.code).toBe(200);
  expect(denied.body.accepted).toBe(false);
  const task = response();
  await handler(
    request(event({ detailed: false, event_name: 'task_created', properties: {} })),
    task
  );
  expect(task.code).toBe(403);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each([-73 * 3600_000, 301_000])(
  'rejects events outside the supported time window: %s',
  async (offset) => {
    const fetchImpl = vi.fn();
    const res = response();
    await createAppAnalyticsHandler({ fetchImpl })(
      request(event({ occurred_at: new Date(Date.now() + offset).toISOString() })),
      res
    );
    expect(res.code).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  }
);

it.each([400, 429, 500])(
  'reports upstream failure without exposing secrets or promising storage (%s)',
  async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status });
    const res = response();
    await createAppAnalyticsHandler({ fetchImpl })(request(), res);
    expect(res.code).toBe(status === 400 ? 400 : 503);
    expect(res.body.accepted).not.toBe(true);
    expect(JSON.stringify(res)).not.toContain('test-only-mp-secret');
  }
);

it('returns a retryable transport error for network failure', async () => {
  const fetchImpl = vi.fn().mockRejectedValue(new Error('URL may contain a secret'));
  const res = response();
  await createAppAnalyticsHandler({ fetchImpl })(request(), res);
  expect(res.code).toBe(503);
  expect(JSON.stringify(res)).not.toContain('URL may contain');
});

it('bounds requests per process and expires the local limit without a database', async () => {
  let now = Date.now();
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 });
  const handler = createAppAnalyticsHandler({ fetchImpl, now: () => now });
  for (let index = 0; index < 120; index++) {
    const res = response();
    await handler(request(), res);
    expect(res.code).toBe(200);
  }
  const limited = response();
  await handler(request(), limited);
  expect(limited.code).toBe(429);
  expect(limited.headers['Retry-After']).toBe('60');
  now += 60_000;
  const resumed = response();
  await handler(request(), resumed);
  expect(resumed.code).toBe(200);
});
