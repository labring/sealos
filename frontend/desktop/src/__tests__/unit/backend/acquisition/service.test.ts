const { db } = vi.hoisted(() => {
  const db: any = {
    acquisitionHandoff: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn()
    },
    acquisitionIdentity: { upsert: vi.fn(), findFirst: vi.fn() },
    mergeUserTransactionInfo: { findUnique: vi.fn() },
    oAuthAuthorizationRequest: { findUnique: vi.fn() },
    productAnalyticsEvent: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn()
    },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn()
  };
  return { db };
});
vi.mock('@/services/backend/db/init', () => ({ globalPrisma: db }));
import {
  beginAcquisition,
  attachAcquisition,
  acquisitionContinuation,
  commitAcquisition,
  issueAcquisition,
  redeemAcquisition,
  subjectSnapshot,
  tokenHash
} from '@/services/backend/acquisition/service';
import {
  acceptAppEvent,
  acceptLifecycle,
  flushAnalytics
} from '@/services/backend/acquisition/analytics';

const requestId = 'f1d2bfd2-1a0c-4fe0-a8c8-aac3bb37e184';
const userUid = '4b5cb295-a620-466c-9653-201a756bc3ed';
const context = {
  version: 1,
  visitor_id: 'website-visitor',
  source: { source: 'newsletter', timestamp: '2026-10-29T00:00:00Z' },
  consent: {
    analytics_storage: 'granted',
    ad_storage: 'unspecified',
    ad_user_data: 'unspecified',
    ad_personalization: 'unspecified'
  }
};
const now = new Date('2026-10-29T01:00:00Z');
beforeEach(() => {
  vi.resetAllMocks();
  db.mergeUserTransactionInfo.findUnique.mockResolvedValue(null);
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv('ACQUISITION_REALM', 'global');
  vi.stubEnv('GOOGLE_ANALYTICS_MEASUREMENT_ID', 'G-TEST');
  vi.stubEnv('GOOGLE_ANALYTICS_MP_API_SECRET', 'server-test-secret');
  db.$transaction.mockImplementation((run: any) => run(db));
  db.productAnalyticsEvent.upsert.mockImplementation((args: any) => Promise.resolve(args.create));
  db.user.findUnique.mockResolvedValue(null);
  global.AppConfig = {
    cloud: { regionUID: 'region' },
    desktop: { auth: { jwt: { marketingConsent: 'receipt-test-secret' } } }
  } as any;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('binds only after a consumed OAuth request and preserves the original browser continuation', async () => {
  const params = {
    installation_id: 'install-1',
    analytics_consent: 'granted',
    website_origin: 'https://sealos.io'
  };
  const url = new URL((await beginAcquisition(params, requestId, 'https://usw-1.sealos.io'))!);
  expect(url.origin + url.pathname).toBe('https://sealos.io/app-attribution');
  const stored = db.acquisitionHandoff.create.mock.calls[0][0].data;
  const capability = url.searchParams.get('handoff')!;
  expect(stored.tokenHash).toBe(tokenHash(capability));
  expect(JSON.stringify(stored)).not.toContain(capability);
  db.acquisitionHandoff.updateMany.mockResolvedValue({ count: 1 });
  await attachAcquisition({ handoff: capability, ...context }, 'https://sealos.io');
  db.acquisitionHandoff.findUnique.mockResolvedValue({ ...stored, payload: context });
  db.oAuthAuthorizationRequest.findUnique.mockResolvedValue({
    id: requestId,
    status: 'PENDING',
    userUid,
    browserHash: tokenHash('browser-secret'),
    expiresAt: new Date(now.getTime() + 600000),
    createdAt: now
  });
  expect(await acquisitionContinuation(capability, () => 'browser-secret')).toBe(
    `/oauth2/code?request_id=${requestId}`
  );
  await commitAcquisition(requestId, userUid);
  expect(db.acquisitionIdentity.upsert).not.toHaveBeenCalled();
  db.oAuthAuthorizationRequest.findUnique.mockResolvedValue({
    status: 'CONSUMED',
    userUid,
    createdAt: now
  });
  await commitAcquisition(requestId, userUid);
  expect(db.acquisitionIdentity.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({
        userUid,
        installationId: 'install-1',
        visitorId: 'website-visitor'
      })
    })
  );
});

it('rejects another browser, wrong website origin and cross-realm attachment', async () => {
  const cap = 'a'.repeat(43);
  await expect(
    attachAcquisition({ ...context, handoff: cap }, 'https://attacker.example')
  ).rejects.toMatchObject({ status: 403 });
  db.acquisitionHandoff.findUnique.mockResolvedValue({
    requestId,
    realm: 'global',
    expiresAt: new Date(now.getTime() + 600000)
  });
  db.oAuthAuthorizationRequest.findUnique.mockResolvedValue({
    status: 'PENDING',
    browserHash: tokenHash('correct'),
    expiresAt: new Date(now.getTime() + 600000)
  });
  await expect(acquisitionContinuation(cap, () => 'wrong')).rejects.toMatchObject({ status: 403 });
  await expect(
    acceptLifecycle({
      version: 1,
      event_id: 'e',
      event_name: 'deploy_success',
      subject_id: userUid,
      realm: 'china',
      occurred_at: now.toISOString()
    })
  ).rejects.toMatchObject({ status: 403 });
});

it('does not block OAuth or record identity when the optional attribution backend fails', async () => {
  db.acquisitionHandoff.create.mockRejectedValue(new Error('database offline'));
  expect(
    await beginAcquisition(
      { installation_id: 'i', analytics_consent: 'granted' },
      requestId,
      'https://usw-1.sealos.io'
    )
  ).toBeUndefined();
  db.acquisitionHandoff.findUnique.mockRejectedValue(new Error('database offline'));
  await expect(commitAcquisition(requestId, userUid)).resolves.toBeUndefined();
});

it('uses a conditional single-use redemption and binds its token to the installation', async () => {
  const issued = await issueAcquisition(context, 'https://sealos.io');
  const stored = db.acquisitionHandoff.create.mock.calls[0][0].data;
  db.acquisitionHandoff.findUnique.mockResolvedValue(stored);
  db.acquisitionHandoff.updateMany
    .mockResolvedValueOnce({ count: 1 })
    .mockResolvedValueOnce({ count: 0 });
  const redeemed = await redeemAcquisition({ code: issued.code, installation_id: 'install-1' });
  expect(redeemed.installation_token).not.toBe(issued.code);
  await expect(
    redeemAcquisition({ code: issued.code, installation_id: 'install-2' })
  ).rejects.toMatchObject({ status: 409 });
  expect(db.acquisitionHandoff.updateMany.mock.calls[0][0].where).toMatchObject({
    redeemedAt: null,
    requestId: null
  });
});

it('exposes a consent-safe signed domestic source without rewriting existing overseas raw values', async () => {
  vi.stubEnv('ACQUISITION_REALM', 'china');
  db.acquisitionIdentity.findFirst.mockResolvedValue({
    payload: context,
    realm: 'china',
    websiteOrigin: 'https://sealos.run',
    linkedAt: now
  });
  const result = await subjectSnapshot(userUid);
  expect(JSON.parse(Buffer.from(result!.sea_attr, 'base64url').toString()).first_touch.source).toBe(
    'newsletter'
  );
  expect(result!.consent.ad_user_data).toBe('unspecified');
  expect(result!.consent_token).toBeTruthy();
  const raw = Buffer.from('{"version":2,"first_touch":null}').toString('base64url');
  db.acquisitionIdentity.findFirst.mockResolvedValue({
    payload: { ...context, sea_attr: raw },
    realm: 'global',
    linkedAt: now
  });
  expect((await subjectSnapshot(userUid))!.sea_attr).toBe(raw);
});

it('acknowledges lifecycle only after durable idempotent storage, even before attribution arrives', async () => {
  const event = {
    version: 1,
    event_id: 'billing-order-1',
    event_name: 'topup_success',
    occurred_at: now.toISOString(),
    subject_id: userUid,
    transaction_id: 'order-1',
    properties: { currency: 'USD', value: 20 }
  };
  expect(await acceptLifecycle(event)).toEqual({
    accepted: true,
    event_id: 'lifecycle:billing-order-1'
  });
  expect(db.productAnalyticsEvent.upsert.mock.calls[0][0]).toMatchObject({
    where: { eventId: 'lifecycle:billing-order-1' },
    update: {},
    create: { subjectId: userUid, payload: { kind: 'lifecycle' } }
  });
  db.productAnalyticsEvent.upsert.mockRejectedValue(new Error('database offline'));
  await expect(acceptLifecycle(event)).rejects.toThrow('database offline');
});

it('delivers Global to MP only and retains failed sends for a later lease', async () => {
  const record = {
    eventId: 'test-id',
    realm: 'global',
    occurredAt: now,
    payload: { client_id: 'i', events: [{ name: 'app_launch' }] },
    attempts: 0
  };
  db.productAnalyticsEvent.findMany.mockResolvedValue([record]);
  db.productAnalyticsEvent.updateMany.mockResolvedValue({ count: 1 });
  const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"success":true}' });
  vi.stubGlobal('fetch', fetcher);
  expect(await flushAnalytics()).toEqual({ examined: 1, delivered: 1 });
  const url = new URL(fetcher.mock.calls[0][0]);
  expect(url.origin).toBe('https://www.google-analytics.com');
  expect(url.searchParams.get('api_secret')).toBe('server-test-secret');
  fetcher.mockRejectedValue(new Error('offline'));
  expect(await flushAnalytics()).toEqual({ examined: 1, delivered: 0 });
  expect(db.productAnalyticsEvent.update.mock.calls.at(-1)[0].data).toMatchObject({
    status: 'PENDING'
  });
});

it('keeps China lifecycle on Rybbit with the canonical account and serialized properties', async () => {
  vi.stubEnv('ACQUISITION_REALM', 'china');
  vi.stubEnv('ACQUISITION_RYBBIT_ORIGIN', 'https://rybbit.example');
  vi.stubEnv('ACQUISITION_RYBBIT_SITE_ID', '1');
  vi.stubEnv('ACQUISITION_RYBBIT_API_KEY', 'server-rybbit-key');
  db.productAnalyticsEvent.findMany.mockResolvedValue([
    {
      eventId: 'e',
      realm: 'china',
      occurredAt: now,
      attempts: 0,
      payload: { user_id: userUid, events: [{ name: 'deploy_success', params: { event_id: 'e' } }] }
    }
  ]);
  db.productAnalyticsEvent.updateMany.mockResolvedValue({ count: 1 });
  const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"success":true}' });
  vi.stubGlobal('fetch', fetcher);
  await flushAnalytics();
  expect(new URL(fetcher.mock.calls[0][0]).origin).toBe('https://rybbit.example');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    user_id: `china:${userUid}`,
    properties: '{"event_id":"e"}'
  });
});

it('does not persist any event after explicit analytics denial', async () => {
  expect(
    await acceptAppEvent({
      version: 1,
      event_id: '6fe5767a-207d-44d2-a43e-0116f66cda0e',
      event_name: 'app_launch',
      occurred_at: now.toISOString(),
      surface: 'desktop_app',
      product_edition: 'global',
      installation_id: 'i',
      detailed: true,
      analytics_consent: 'denied'
    })
  ).toMatchObject({ accepted: false });
  expect(db.productAnalyticsEvent.upsert).not.toHaveBeenCalled();
});

it('keeps trusted historical facts durable without relabeling their occurrence time', async () => {
  const old = '2026-10-01T00:00:00Z';
  await expect(
    acceptLifecycle({
      version: 1,
      event_id: 'old-order',
      event_name: 'topup_success',
      subject_id: userUid,
      occurred_at: old,
      transaction_id: 'old-order',
      properties: { currency: 'USD', value: 20 }
    })
  ).resolves.toMatchObject({ accepted: true });
  expect(db.productAnalyticsEvent.upsert.mock.calls[0][0].create.occurredAt.toISOString()).toBe(
    new Date(old).toISOString()
  );
});

it.each([
  'Site over monthly limit, event not tracked',
  '{"success":true,"message":"Event not tracked - IP excluded"}'
])('does not mark an HTTP 200 filtered Rybbit response as delivered: %s', async (receipt) => {
  vi.stubEnv('ACQUISITION_REALM', 'china');
  vi.stubEnv('ACQUISITION_RYBBIT_ORIGIN', 'https://rybbit.example');
  vi.stubEnv('ACQUISITION_RYBBIT_SITE_ID', '1');
  vi.stubEnv('ACQUISITION_RYBBIT_API_KEY', 'server-rybbit-key');
  db.productAnalyticsEvent.findMany.mockResolvedValue([
    {
      eventId: 'e',
      realm: 'china',
      occurredAt: now,
      attempts: 0,
      payload: { user_id: userUid, events: [{ name: 'deploy_success', params: { event_id: 'e' } }] }
    }
  ]);
  db.productAnalyticsEvent.updateMany.mockResolvedValue({ count: 1 });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => receipt }));
  expect(await flushAnalytics()).toMatchObject({ delivered: 0 });
  expect(db.productAnalyticsEvent.update.mock.calls.at(-1)[0].data.status).toBe('FILTERED');
});

it('resolves delayed payment identity through the trusted account merge ledger only', async () => {
  const target = '3f450c0e-4bfe-46ff-968a-35502b853f2f';
  db.mergeUserTransactionInfo.findUnique
    .mockResolvedValueOnce({ userUid: target })
    .mockResolvedValueOnce(null);
  await acceptLifecycle({
    version: 1,
    event_id: 'after-merge',
    event_name: 'topup_success',
    subject_id: userUid,
    occurred_at: now.toISOString(),
    transaction_id: 'paid-order',
    properties: { currency: 'USD', value: 20 }
  });
  const stored = db.productAnalyticsEvent.upsert.mock.calls[0][0].create;
  expect(stored.subjectId).toBe(target);
  expect(stored.payload.event.subject_id).toBe(userUid);
});

it('does not trust a browser to redact unconsented click IDs from an opaque sea_attr', async () => {
  const raw = Buffer.from(
    JSON.stringify({
      version: 2,
      first_touch: { click_id_type: 'gclid', click_id_value: 'test-click-only' }
    })
  ).toString('base64url');
  await issueAcquisition({ ...context, sea_attr: raw }, 'https://sealos.io');
  expect(db.acquisitionHandoff.create.mock.calls[0][0].data.payload).not.toHaveProperty('sea_attr');
  expect(db.acquisitionHandoff.create.mock.calls[0][0].data.payload.source).toEqual(context.source);
});
