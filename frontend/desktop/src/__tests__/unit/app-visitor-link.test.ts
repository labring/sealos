import { clearWebAnalyticsIdentity, trackWebVisitorLink } from '@/utils/app-visitor-link';
import useSessionStore from '@/stores/session';

const uid = 'b7fa951a-1683-4a43-82f0-a6e1089f96ea';
const visitor = '41781e2d-cf00-4b7c-8712-25aa7e47f2bf';
const context = {
  version: 1,
  realm: 'global',
  subject_id: uid,
  visitor_id: visitor,
  consent: {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  },
  platform_ids: { ga_client_id: '123.456' },
  source: { source: 'google' }
};
const encode = (data: unknown) =>
  `sealos_acquisition_v1=${Buffer.from(JSON.stringify(data)).toString('base64url')}`;
const environment = (realm: string = 'global') => {
  const dataLayer: any[] = [];
  const rybbit = { identify: vi.fn(), event: vi.fn(), clearUserId: vi.fn() };
  const web: any = {
    location: {
      protocol: 'https:',
      hostname: realm === 'global' ? 'usw-1.sealos.io' : 'hzh.sealos.run'
    },
    dataLayer,
    rybbit,
    setTimeout,
    clearTimeout
  };
  vi.stubGlobal('window', web);
  vi.stubGlobal('document', { cookie: encode({ ...context, realm }) });
  return web;
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('sets verified UID before Web event, preserving browser CID and clearing stale source', async () => {
  vi.useFakeTimers();
  const web = environment();
  const delivery = trackWebVisitorLink(context);
  expect(Array.from(web.dataLayer[0])).toEqual(['set', { user_id: uid }]);
  expect(web.dataLayer[1]).toEqual({ source: null });
  const event = web.dataLayer[2];
  expect(event).toMatchObject({
    event: 'web_visitor_linked',
    user_id: uid,
    visitor_id: visitor,
    analytics_consent: 'granted'
  });
  expect(JSON.stringify(web.dataLayer)).not.toContain('analytics_token');
  expect(JSON.stringify(web.dataLayer)).not.toContain('ga_client_id');
  expect(JSON.stringify(web.dataLayer)).not.toContain('web_client_id');
  expect(web.dataLayer[0][1]).not.toHaveProperty('client_id');
  event.eventCallback();
  await delivery;
});
it('navigation wait is bounded even if GTM is missing', async () => {
  vi.useFakeTimers();
  environment();
  const delivery = trackWebVisitorLink(context);
  await vi.advanceTimersByTimeAsync(501);
  await delivery;
});
it.each([
  '',
  encode({ ...context, realm: 'china' }),
  encode({ ...context, visitor_id: uid }),
  encode({ ...context, consent: { ...context.consent, analytics_storage: 'denied' } })
])('checks current Cookie again before emitting %#', async (cookie) => {
  const web = environment();
  document.cookie = cookie;
  await trackWebVisitorLink(context);
  expect(web.dataLayer).toHaveLength(0);
  expect(web.rybbit.identify).not.toHaveBeenCalled();
});
it.each(['http://usw-1.sealos.io', 'https://www.sealos.io', 'https://sealos.io.attacker.test'])(
  'rejects an unrelated/insecure Web surface %s',
  async (url) => {
    const web = environment();
    web.location = new URL(url);
    await trackWebVisitorLink(context);
    expect(web.dataLayer).toHaveLength(0);
  }
);
it('domestic Web links using raw UID and existing Rybbit', async () => {
  const web = environment('china');
  await trackWebVisitorLink({ ...context, realm: 'china' });
  expect(web.rybbit.identify).toHaveBeenCalledWith(uid);
  expect(web.rybbit.event).toHaveBeenCalledWith(
    'web_visitor_linked',
    expect.objectContaining({ visitor_id: visitor, product_user_id: uid })
  );
  expect(web.dataLayer).toHaveLength(0);
});
it('clears GA and persisted Rybbit identity on logout and account change', async () => {
  const web = environment();
  const session = (id: string) => ({ user: { userUid: id }, token: '' } as any);
  useSessionStore.getState().setSession(session(uid));
  web.rybbit.clearUserId.mockClear();
  web.dataLayer.length = 0;
  useSessionStore.getState().delSession();
  expect(web.rybbit.clearUserId).toHaveBeenCalledTimes(1);
  expect(Array.from(web.dataLayer[0])).toEqual(['set', { user_id: null }]);
  useSessionStore.getState().setSession(session(uid));
  web.rybbit.clearUserId.mockClear();
  useSessionStore.getState().setSession(session(visitor));
  expect(web.rybbit.clearUserId).toHaveBeenCalledTimes(1);
});
it('SDK failures never prevent clearing authentication', () => {
  const web = environment();
  web.rybbit.clearUserId.mockImplementation(() => {
    throw new Error('SDK error');
  });
  expect(() => clearWebAnalyticsIdentity()).not.toThrow();
  expect(() => useSessionStore.getState().delSession()).not.toThrow();
});
