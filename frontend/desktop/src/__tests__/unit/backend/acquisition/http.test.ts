const { db } = vi.hoisted(() => ({
  db: {
    acquisitionHandoff: { create: vi.fn() },
    productAnalyticsEvent: { upsert: vi.fn() }
  }
}));
vi.mock('@/services/backend/db/init', () => ({ globalPrisma: db }));
vi.mock('@/services/backend/acquisition/http', () => ({ acquisitionHttp: vi.fn() }));
import issue from '@/pages/api/marketing/acquisition/issue';
import events from '@/pages/api/analytics/events';
import lifecycle from '@/pages/api/analytics/lifecycle';
import { generateOAuth2AccessToken } from '@/services/backend/auth';

function response() {
  const res: any = { code: 200, body: null, headers: {} };
  res.status = (code: number) => {
    res.code = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  res.setHeader = (name: string, value: unknown) => {
    res.headers[name] = value;
    return res;
  };
  res.end = () => res;
  return res;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('ACQUISITION_REALM', 'global');
  vi.stubEnv('ACQUISITION_INGEST_SECRET', 'test-shared-secret');
  global.AppConfig = { desktop: { auth: { jwt: { global: 'global-http-test-secret' } } } } as any;
  db.productAnalyticsEvent.upsert.mockImplementation((args: any) => Promise.resolve(args.create));
});
afterEach(() => {
  vi.unstubAllEnvs();
});

it('supports the actual cross-origin website preflight and rejects lookalike origins', async () => {
  vi.stubEnv('ACQUISITION_WEBSITE_ORIGINS', ''); // Helm's default optional field.
  const res = response();
  await issue({ method: 'OPTIONS', headers: { origin: 'https://sealos.io' } } as any, res);
  expect(res.code).toBe(204);
  expect(res.headers['Access-Control-Allow-Origin']).toBe('https://sealos.io');
  expect(db.acquisitionHandoff.create).not.toHaveBeenCalled();
  const wrong = response();
  await issue(
    {
      method: 'POST',
      headers: { origin: 'https://sealos.io.evil.example', 'content-type': 'application/json' }
    } as any,
    wrong
  );
  expect(wrong.code).toBe(403);
  expect(db.acquisitionHandoff.create).not.toHaveBeenCalled();
});

it('returns a raw short-lived code and never returns source or account credentials', async () => {
  const res = response();
  await issue(
    {
      method: 'POST',
      headers: { origin: 'https://sealos.io', 'content-type': 'application/json' },
      body: { version: 1, visitor_id: 'visitor', consent: { analytics_storage: 'granted' } }
    } as any,
    res
  );
  expect(res.code).toBe(201);
  expect(res.body.code).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(res.body).toEqual({ code: expect.any(String), expires_at: expect.any(String) });
  expect(res.headers['Referrer-Policy']).toBe('no-referrer');
});

it('uses the real native JWT subject, rejects refresh/forged tokens, and does not accept browser callers', async () => {
  const uid = '47edfe55-1522-477b-9854-c9f922342d49';
  const token = generateOAuth2AccessToken(
    { sub: uid, user_id: '10001', client_id: 'sealos-io', preferred_username: 'test' },
    '3600s'
  );
  const body = {
    version: 1,
    event_id: '509ad38b-dfcc-453b-9bee-3d76987c78cc',
    event_name: 'app_launch',
    occurred_at: new Date().toISOString(),
    surface: 'desktop_app',
    product_edition: 'global',
    installation_id: 'i',
    analytics_consent: 'granted',
    detailed: true
  };
  const res = response();
  await events({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body } as any, res);
  expect(res.code).toBe(202);
  expect(db.productAnalyticsEvent.upsert.mock.calls[0][0].create.subjectId).toBe(uid);
  const bad = response();
  await events({ method: 'POST', headers: { authorization: 'Bearer forged' }, body } as any, bad);
  expect(bad.code).toBe(401);
  const browser = response();
  await events({ method: 'POST', headers: { origin: 'https://sealos.io' }, body } as any, browser);
  expect(browser.code).toBe(403);
});

it('requires the server ingest secret before accepting any revenue fact', async () => {
  const res = response();
  await lifecycle({ method: 'POST', headers: {}, body: {} } as any, res);
  expect(res.code).toBe(401);
  expect(db.productAnalyticsEvent.upsert).not.toHaveBeenCalled();
  const accepted = response();
  await lifecycle(
    {
      method: 'POST',
      headers: { authorization: 'Bearer test-shared-secret' },
      body: {
        version: 1,
        event_id: 'order-1',
        event_name: 'topup_success',
        subject_id: '47edfe55-1522-477b-9854-c9f922342d49',
        occurred_at: new Date().toISOString(),
        transaction_id: 'order-1',
        properties: { currency: 'USD', value: 20 }
      }
    } as any,
    accepted
  );
  expect(accepted.code).toBe(202);
  expect(accepted.body.accepted).toBe(true);
});

it.each([
  ['global', 'https://www.sealos.io'],
  ['china', 'https://sealos.run'],
  ['china', 'https://www.sealos.run']
])('returns only reviewed literal CORS origins for %s %s', async (selectedRealm, origin) => {
  vi.stubEnv('ACQUISITION_REALM', selectedRealm);
  vi.stubEnv('ACQUISITION_WEBSITE_ORIGINS', '');
  const res = response();
  await issue({ method: 'OPTIONS', headers: { origin } } as any, res);
  expect(res.code).toBe(204);
  expect(res.headers['Access-Control-Allow-Origin']).toBe(origin);
});
