import { sign, verify } from 'jsonwebtoken';
import { ACQUISITION_COOKIE, readAcquisitionCookie } from '@/schema/app-attribution';
import {
  analyticsCookieHeader,
  analyticsRealm,
  beginAnalyticsHandoff,
  approveAnalyticsHandoff,
  redeemAnalyticsHandoff
} from '@/services/backend/oauth2/analytics-cookie';
import { OAuth2TokenSuccessResponseSchema } from '@/schema/oauth2';

const uid = 'b7fa951a-1683-4a43-82f0-a6e1089f96ea';
const visitor = '41781e2d-cf00-4b7c-8712-25aa7e47f2bf';
const binding = { id: 'request-1', clientId: 'sealos-io', state: 'random-browser-state' };
const origin = 'https://usw-1.sealos.io';
const params = {
  client_id: binding.clientId,
  state: binding.state,
  analytics_consent: 'granted',
  analytics_installation_id: `install-${'a'.repeat(32)}`
};
const data = {
  version: 1,
  realm: 'global',
  visitor_id: visitor,
  consent: {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  },
  source: {
    source: 'google',
    campaign: 'developers',
    landing_page: 'https://sealos.io/download',
    timestamp: '2026-10-29T10:00:00.000Z'
  }
};
const cookie = (value: unknown = data) => Buffer.from(JSON.stringify(value)).toString('base64url');
const requestToken = () => beginAnalyticsHandoff(params, binding.id, cookie(), origin)!;
const receipt = () => approveAnalyticsHandoff(requestToken(), binding, uid, cookie(), origin)!;
describe('stateless App Cookie handoff', () => {
  const previous = global.AppConfig;
  beforeEach(() => {
    global.AppConfig = { desktop: { auth: { jwt: { global: 'test-analytics-secret' } } } } as any;
  });
  afterEach(() => {
    global.AppConfig = previous;
    vi.useRealTimers();
  });
  it('keeps browser visitor, installation, source and verified UID without a database', () => {
    const approved = receipt();
    expect(redeemAnalyticsHandoff(approved.token, binding, uid, origin)).toEqual({
      ...data,
      subject_id: uid,
      installation_id: params.analytics_installation_id
    });
    expect(approved.context.subject_id).toBe(uid);
    expect(ACQUISITION_COOKIE).toBe('sealos_acquisition_v1');
  });
  it('allows a not-yet-ready install ID, but never substitutes the website CID', () => {
    const token = beginAnalyticsHandoff(
      { ...params, analytics_installation_id: undefined! },
      binding.id,
      cookie(),
      origin
    )!;
    const approved = approveAnalyticsHandoff(token, binding, uid, cookie(), origin)!;
    expect(approved.context.installation_id).toBeUndefined();
    expect(approved.context).not.toHaveProperty('platform_ids');
  });
  it('discards legacy platform IDs before signing or returning OAuth metadata', () => {
    const legacy = cookie({
      ...data,
      platform_ids: { ga_client_id: '1234.5678', rybbit_user_id: 'legacy-visitor' }
    });
    expect(readAcquisitionCookie(legacy, 'global')).not.toHaveProperty('platform_ids');
    const request = beginAnalyticsHandoff(params, binding.id, legacy, origin)!;
    const approved = approveAnalyticsHandoff(request, binding, uid, legacy, origin)!;
    expect(approved.context).not.toHaveProperty('platform_ids');
    expect(redeemAnalyticsHandoff(approved.token, binding, uid, origin)).not.toHaveProperty(
      'platform_ids'
    );
  });
  it.each([
    'http://usw-1.sealos.io',
    'https://sealos.io.attacker.test',
    'https://private.example',
    'invalid'
  ])('does not infer a realm from %s', (value) => {
    expect(analyticsRealm(value)).toBeUndefined();
    expect(beginAnalyticsHandoff(params, binding.id, cookie(), value)).toBeUndefined();
  });
  it('separates China and Global while using the same UID format', () => {
    const china = cookie({ ...data, realm: 'china' });
    expect(readAcquisitionCookie(china, 'global')).toBeUndefined();
    expect(beginAnalyticsHandoff(params, binding.id, china, origin)).toBeUndefined();
    expect(
      beginAnalyticsHandoff(
        { ...params, client_id: 'sealox-desktop-bja' },
        binding.id,
        china,
        'https://hzh.sealos.run'
      )
    ).toEqual(expect.any(String));
  });
  it.each(['denied', 'unspecified', ''])('requires App analytics permission %s', (permission) => {
    expect(
      beginAnalyticsHandoff(
        { ...params, analytics_consent: permission },
        binding.id,
        cookie(),
        origin
      )
    ).toBeUndefined();
  });
  it('accepts only official native clients and correctly formatted install IDs', () => {
    expect(
      beginAnalyticsHandoff({ ...params, client_id: 'other-app' }, binding.id, cookie(), origin)
    ).toBeUndefined();
    expect(
      beginAnalyticsHandoff(
        { ...params, analytics_installation_id: 'email@example.com' },
        binding.id,
        cookie(),
        origin
      )
    ).toBeUndefined();
  });
  it.each([undefined, '', '123456789'])(
    'fails closed with missing/default signing secret',
    (key) => {
      global.AppConfig.desktop.auth.jwt.global = key!;
      expect(beginAnalyticsHandoff(params, binding.id, cookie(), origin)).toBeUndefined();
    }
  );
  it.each([
    undefined,
    '',
    'bad!',
    cookie({ ...data, version: 2 }),
    cookie({ ...data, visitor_id: 'a@example.com' }),
    cookie({ ...data, consent: { ...data.consent, analytics_storage: 'denied' } }),
    cookie({ ...data, source: { landing_page: 'https://example.com/?email=secret' } }),
    cookie({ ...data, source: { landing_page: 'https://user:pass@example.com/' } }),
    cookie({ ...data, sea_attr: 'a'.repeat(513) }),
    cookie({ ...data, extra: 'x'.repeat(1800) })
  ])('ignores malformed/denied/oversized Cookie %#', (raw) => {
    expect(readAcquisitionCookie(raw, 'global')).toBeUndefined();
  });
  it('strips opaque advertising data unless all three ad permissions are granted', () => {
    expect(
      readAcquisitionCookie(cookie({ ...data, sea_attr: 'YWJj' }), 'global')?.sea_attr
    ).toBeUndefined();
    const granted = {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    };
    expect(
      readAcquisitionCookie(cookie({ ...data, consent: granted, sea_attr: 'YWJj' }), 'global')
        ?.sea_attr
    ).toBe('YWJj');
  });
  it('rechecks current Cookie at approval, so withdrawal cannot revive the snapshot', () => {
    const token = requestToken();
    expect(approveAnalyticsHandoff(token, binding, uid, undefined, origin)).toBeUndefined();
    expect(
      approveAnalyticsHandoff(token, binding, uid, cookie({ ...data, visitor_id: uid }), origin)
    ).toBeUndefined();
    expect(
      approveAnalyticsHandoff(
        token,
        binding,
        uid,
        cookie({ ...data, consent: { ...data.consent, analytics_storage: 'denied' } }),
        origin
      )
    ).toBeUndefined();
  });
  it.each([
    { ...binding, id: 'another' },
    { ...binding, clientId: 'sealox-desktop-bja' },
    { ...binding, state: 'another' }
  ])('binds both request and receipt to the real OAuth transaction %#', (wrong) => {
    expect(approveAnalyticsHandoff(requestToken(), wrong, uid, cookie(), origin)).toBeUndefined();
    expect(redeemAnalyticsHandoff(receipt().token, wrong, uid, origin)).toBeUndefined();
  });
  it('does not accept a request token as a receipt or a different authenticated account', () => {
    expect(redeemAnalyticsHandoff(requestToken(), binding, uid, origin)).toBeUndefined();
    expect(redeemAnalyticsHandoff(receipt().token, binding, visitor, origin)).toBeUndefined();
    expect(
      redeemAnalyticsHandoff(receipt().token, binding, uid, 'https://hzh.sealos.run')
    ).toBeUndefined();
  });
  it('rejects tampering, wrong key and wrong purpose', () => {
    expect(() => verify(receipt().token, 'test-analytics-secret')).toThrow();
    expect(redeemAnalyticsHandoff(`${receipt().token}x`, binding, uid, origin)).toBeUndefined();
    expect(redeemAnalyticsHandoff(sign({}, 'other-key'), binding, uid, origin)).toBeUndefined();
    expect(
      redeemAnalyticsHandoff(
        sign({}, 'test-analytics-secret', {
          audience: 'login',
          issuer: 'sealos-desktop-analytics'
        }),
        binding,
        uid,
        origin
      )
    ).toBeUndefined();
  });
  it('expires requests after 10 minutes and receipts after 5 minutes', () => {
    vi.useFakeTimers();
    const token = requestToken(),
      approved = receipt();
    vi.advanceTimersByTime(301_000);
    expect(redeemAnalyticsHandoff(approved.token, binding, uid, origin)).toBeUndefined();
    vi.advanceTimersByTime(300_000);
    expect(approveAnalyticsHandoff(token, binding, uid, cookie(), origin)).toBeUndefined();
  });
  it('keeps metadata through the public token response schema, without leaking receipts', () => {
    const response = OAuth2TokenSuccessResponseSchema.parse({
      access_token: 'a',
      refresh_token: 'r',
      token_type: 'Bearer',
      expires_in: 3600,
      analytics_context: receipt().context,
      analytics_token: receipt().token
    });
    expect(response.analytics_context?.subject_id).toBe(uid);
    expect(response).not.toHaveProperty('analytics_token');
  });
  it('uses a host-only HttpOnly request Cookie and expires it on decision', () => {
    const header = analyticsCookieHeader(binding.id, requestToken(), origin);
    expect(header).toContain(
      'HttpOnly; SameSite=Lax; Path=/api/auth/oauth2/code; Max-Age=600; Secure'
    );
    expect(header).not.toContain('Domain=');
    expect(analyticsCookieHeader(binding.id, '', origin)).toContain('Max-Age=0');
  });
});
