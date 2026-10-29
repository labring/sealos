const { db } = vi.hoisted(() => ({
  db: {
    acquisitionIdentity: { findFirst: vi.fn() },
    productAnalyticsEvent: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn()
    }
  }
}));
vi.mock('@/services/backend/db/init', () => ({ globalPrisma: db }));
import { flushAnalytics } from '@/services/backend/acquisition/analytics';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('ACQUISITION_REALM', 'china');
  vi.stubEnv('ACQUISITION_RYBBIT_ORIGIN', 'https://rybbit.example');
  vi.stubEnv('ACQUISITION_RYBBIT_SITE_ID', '1');
  vi.stubEnv('ACQUISITION_RYBBIT_API_KEY', 'test-server-ingest-key');
  db.productAnalyticsEvent.findMany.mockResolvedValue([
    {
      eventId: 'lifecycle:test-deployment',
      realm: 'china',
      occurredAt: new Date(),
      attempts: 0,
      payload: {
        client_id: 'install-test',
        user_id: 'f52e329e-43c7-442f-a556-fd17f870042e',
        events: [{ name: 'deploy_success', params: { event_id: 'test-deployment' } }]
      }
    }
  ]);
  db.productAnalyticsEvent.updateMany.mockResolvedValue({ count: 1 });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Rybbit v2.9.1 actual response contract', () => {
  it.each([
    ['excluded', JSON.stringify({ success: true, message: 'Event not tracked - IP excluded' })],
    ['monthly limit', 'Site over monthly limit, event not tracked']
  ])('does not mark an HTTP 200 %s response as delivered', async (_reason, body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    const result = await flushAnalytics();
    expect(result.delivered).toBe(0);
    expect(db.productAnalyticsEvent.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DELIVERED' })
      })
    );
  });
});

it('attributes a deployment to the account link effective at the event, not a later OAuth completion', async () => {
  vi.stubEnv('ACQUISITION_REALM', 'global');
  vi.stubEnv('GOOGLE_ANALYTICS_MEASUREMENT_ID', 'G-TEST');
  vi.stubEnv('GOOGLE_ANALYTICS_MP_API_SECRET', 'test-mp-secret');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-29T12:11:00.000Z'));
  const occurredAt = new Date('2026-10-29T12:07:00.000Z');
  const userUid = 'f52e329e-43c7-442f-a556-fd17f870042e';
  const permitted = { version: 1, consent: { analytics_storage: 'granted' } };
  const links = [
    {
      installationId: 'install-a',
      journeyStartedAt: new Date('2026-10-29T12:00:00Z'),
      linkedAt: new Date('2026-10-29T12:10:00Z'),
      payload: permitted
    },
    {
      installationId: 'install-b',
      journeyStartedAt: new Date('2026-10-29T12:05:00Z'),
      linkedAt: new Date('2026-10-29T12:06:00Z'),
      payload: permitted
    }
  ];
  db.acquisitionIdentity.findFirst.mockImplementation(async ({ where }: any) => {
    // Model the two candidate rows: A's request began first, but only B had committed at 12:07.
    return links
      .filter((link) =>
        where.linkedAt
          ? link.linkedAt <= where.linkedAt.lte
          : link.journeyStartedAt <= where.journeyStartedAt.lte
      )
      .sort((a, b) => b.linkedAt.getTime() - a.linkedAt.getTime())[0];
  });
  db.productAnalyticsEvent.findMany.mockResolvedValue([
    {
      eventId: 'lifecycle:deployment-at-1207',
      realm: 'global',
      subjectId: userUid,
      occurredAt,
      attempts: 0,
      payload: {
        kind: 'lifecycle',
        event: {
          version: 1,
          event_id: 'deployment-at-1207',
          event_name: 'deploy_success',
          occurred_at: occurredAt.toISOString(),
          subject_id: userUid,
          properties: {}
        }
      }
    }
  ]);
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetcher);
  try {
    expect((await flushAnalytics()).delivered).toBe(1);
    expect(db.acquisitionIdentity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userUid, linkedAt: { lte: occurredAt } })
      })
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body).client_id).toBe('4280999480.4064935641');
  } finally {
    vi.useRealTimers();
  }
});
