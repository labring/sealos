import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { sign } from 'jsonwebtoken';
import { PrismaClient } from '../../../prisma/providers/postgresql/global/generated/client';
import { vi } from 'vitest';
import { PrismaClient as CockroachClient } from '../../../prisma/global/generated/client';

// An isolated database is required. Never use the application's configured database.
const databaseUrl = process.env.OAUTH_TEST_DATABASE_URL;
const cockroach = process.env.OAUTH_TEST_DB_PROVIDER === 'cockroachdb';
const DatabaseClient = (cockroach ? CockroachClient : PrismaClient) as typeof PrismaClient;
const db = new DatabaseClient({
  datasources: { db: { url: databaseUrl || 'postgresql://unused' } }
});
vi.mock('@/services/backend/db/init', () => ({ globalPrisma: db }));

const uid = randomUUID();
const clientId = `pkce-${uid}`;
const redirectUri = 'io.sealos.desktop:/callback';
const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'; // RFC 7636 vector
let authorize: any;
const call = async (handler: any, options: any = {}) => {
  const res: any = { statusCode: 200, headers: {}, body: undefined };
  res.setHeader = (key: string, value: string) => {
    res.headers[key] = value;
    return res;
  };
  res.status = (status: number) => {
    res.statusCode = status;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  res.end = () => res;
  res.redirect = (status: number, url: string) => {
    res.statusCode = status;
    res.headers.Location = url;
    return res;
  };
  await handler(
    {
      method: 'GET',
      query: {},
      body: {},
      cookies: {},
      headers: {},
      socket: { remoteAddress: randomUUID() },
      ...options
    },
    res
  );
  return res;
};
const query = () => ({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  state: 'test-state',
  code_challenge: challenge,
  code_challenge_method: 'S256'
});

describe.skipIf(!databaseUrl)('authorization code HTTP contract', () => {
  beforeAll(async () => {
    global.AppConfig = {
      cloud: { regionUID: 'test-region', domain: 'auth.example.test', port: '443' },
      desktop: {
        auth: {
          callbackURL: 'https://auth.example.test',
          jwt: { global: 'test-global', regional: 'test-region-secret' },
          oauth2idp: { enabled: true, authorizationCodeEnabled: true }
        }
      }
    } as any;
    authorize = (await import('@/pages/api/auth/oauth2/code/authorize')).default;
    await db.user.create({ data: { uid, id: uid, name: uid, nickname: 'Alice', avatarUri: '' } });
    await db.oAuthClient.create({
      data: {
        clientId,
        name: 'Desktop',
        allowedGrantTypes: ['authorization_code', 'refresh_token'],
        redirectUris: [redirectUri]
      }
    });
  });
  afterAll(async () => {
    await db.oAuthAuthorizationRequest.deleteMany({ where: { clientId } });
    await db.oAuthRefreshSession.deleteMany({ where: { clientId } });
    await db.oAuthClient.deleteMany({ where: { clientId } });
    await db.user.deleteMany({ where: { uid } });
    await db.$disconnect();
  });
  it('opens a separate authorization page without issuing a token', async () => {
    const res = await call(authorize, { query: query() });
    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toMatch(/^\/oauth2\/code\?request_id=/);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.headers['Set-Cookie']).toContain('HttpOnly');
    expect(res.body).toBeUndefined();
  });
  it('approves a browser-bound request and exchanges the RFC PKCE vector for a usable token', async () => {
    const started = await call(authorize, { query: query() });
    const requestId = new URL(
      started.headers.Location,
      'https://auth.example.test'
    ).searchParams.get('request_id');
    const cookie = started.headers['Set-Cookie'].split(';')[0].split('=');
    const decision = (await import('@/pages/api/auth/oauth2/code/decision')).default;
    const approved = await call(decision, {
      method: 'POST',
      body: { request_id: requestId, decision: 'approve' },
      cookies: { [cookie[0]]: cookie[1] },
      headers: {
        origin: 'https://auth.example.test',
        'content-type': 'application/json',
        authorization: sign({ userUid: uid, regionUid: 'test-region' }, 'test-region-secret')
      }
    });
    expect(approved.statusCode).toBe(200);
    const callback = new URL(approved.body.redirect_uri);
    expect(callback.searchParams.get('state')).toBe('test-state');
    const token = (await import('@/pages/api/auth/oauth2/token')).default;
    const result = await call(token, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code: callback.searchParams.get('code')!,
        code_verifier: verifier
      }).toString()
    });
    expect(result.statusCode).toBe(200);
    expect(result.body.refresh_token).toMatch(/^sc_rt_/);
    const { verifyGlobalToken } = await import('@/services/backend/auth');
    expect(await verifyGlobalToken({ authorization: result.body.access_token })).toMatchObject({
      userUid: uid,
      userId: uid
    });
  });

  it('rotates refresh tokens, revokes their session, and treats repeated revocation as success', async () => {
    const started = await call(authorize, { query: query() });
    const id = new URL(started.headers.Location, 'https://auth.example.test').searchParams.get(
      'request_id'
    );
    const [cookieName, cookieValue] = started.headers['Set-Cookie'].split(';')[0].split('=');
    const decision = (await import('@/pages/api/auth/oauth2/code/decision')).default;
    const approved = await call(decision, {
      method: 'POST',
      body: { request_id: id, decision: 'approve' },
      cookies: { [cookieName]: cookieValue },
      headers: {
        origin: 'https://auth.example.test',
        'content-type': 'application/json',
        authorization: sign({ userUid: uid, regionUid: 'test-region' }, 'test-region-secret')
      }
    });
    const token = (await import('@/pages/api/auth/oauth2/token')).default;
    const issued = await call(token, {
      method: 'POST',
      body: {
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code: new URL(approved.body.redirect_uri).searchParams.get('code'),
        code_verifier: verifier
      }
    });
    const refreshed = await call(token, {
      method: 'POST',
      body: {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: issued.body.refresh_token
      }
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.body.refresh_token).not.toBe(issued.body.refresh_token);
    const revoke = (await import('@/pages/api/auth/oauth2/code/revoke')).default;
    for (let i = 0; i < 2; i++)
      expect(
        (
          await call(revoke, {
            method: 'POST',
            body: { client_id: clientId, token: refreshed.body.refresh_token }
          })
        ).statusCode
      ).toBe(200);
    const rejected = await call(token, {
      method: 'POST',
      body: {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshed.body.refresh_token
      }
    });
    expect(rejected.body.error).toBe('invalid_grant');
  });
  const browserRequest = async () => {
    const started = await call(authorize, { query: query() });
    expect(started.statusCode).toBe(302);
    const request_id = new URL(
      started.headers.Location,
      'https://auth.example.test'
    ).searchParams.get('request_id')!;
    const [name, value] = started.headers['Set-Cookie'].split(';')[0].split('=');
    return {
      method: 'POST',
      body: { request_id, decision: 'approve' },
      cookies: { [name]: value },
      headers: {
        origin: 'https://auth.example.test',
        'content-type': 'application/json',
        authorization: sign({ userUid: uid, regionUid: 'test-region' }, 'test-region-secret')
      }
    };
  };
  const grant = async () => {
    const decision = (await import('@/pages/api/auth/oauth2/code/decision')).default;
    const approved = await call(decision, await browserRequest());
    expect(approved.statusCode).toBe(200);
    return {
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: new URL(approved.body.redirect_uri).searchParams.get('code')!,
      code_verifier: verifier
    };
  };
  const exchange = async (body: Record<string, unknown> | string) =>
    call((await import('@/pages/api/auth/oauth2/token')).default, { method: 'POST', body });

  it.each([
    ['code_challenge_method', 'plain', 'invalid_request'],
    ['code_challenge', 'bad', 'invalid_request'],
    ['state', '', 'invalid_request'],
    ['response_type', 'token', 'unsupported_response_type'],
    ['scope', 'openid', 'invalid_scope']
  ])(
    'returns %s validation errors only to the registered callback',
    async (field, value, error) => {
      const res = await call(authorize, { query: { ...query(), [field]: value } });
      expect(res.statusCode).toBe(302);
      expect(new URL(res.headers.Location).searchParams.get('error')).toBe(error);
    }
  );
  it.each([
    'https://evil.test/callback',
    'io.sealos.desktop:/callback#fragment',
    'http://evil.test/callback'
  ])('never redirects to an unregistered URI: %s', async (redirect_uri) => {
    const res = await call(authorize, { query: { ...query(), redirect_uri } });
    expect(res.statusCode).toBe(400);
    expect(res.headers.Location).toBeUndefined();
  });
  it('rejects duplicate authorization parameters', async () => {
    const res = await call(authorize, { query: { ...query(), client_id: [clientId, clientId] } });
    expect(res.body.error).toBe('invalid_request');
    expect(res.headers.Location).toBeUndefined();
  });
  it('shows the account and app through the authenticated context endpoint', async () => {
    const req = await browserRequest();
    const context = (await import('@/pages/api/auth/oauth2/code/context')).default;
    const res = await call(context, {
      ...req,
      method: 'GET',
      query: { request_id: req.body.request_id }
    });
    expect(res.body).toMatchObject({ account: 'Alice', client_name: 'Desktop' });
  });
  it('returns access_denied and state when the user refuses', async () => {
    const req = await browserRequest();
    req.body.decision = 'deny';
    const res = await call((await import('@/pages/api/auth/oauth2/code/decision')).default, req);
    const uri = new URL(res.body.redirect_uri);
    expect(uri.searchParams.get('error')).toBe('access_denied');
    expect(uri.searchParams.get('state')).toBe('test-state');
    expect(uri.searchParams.has('code')).toBe(false);
  });
  it('requires login, the initiating browser cookie, and same-origin JSON decisions', async () => {
    const req = await browserRequest();
    const decision = (await import('@/pages/api/auth/oauth2/code/decision')).default;
    expect((await call(decision, { ...req, cookies: {} })).body.error).toBe('invalid_grant');
    expect(
      (await call(decision, { ...req, headers: { ...req.headers, authorization: '' } })).statusCode
    ).toBe(401);
    expect(
      (await call(decision, { ...req, headers: { ...req.headers, origin: 'https://evil.test' } }))
        .statusCode
    ).toBe(403);
    expect(
      (await call(decision, { ...req, headers: { ...req.headers, 'content-type': 'text/plain' } }))
        .statusCode
    ).toBe(403);
  });
  it('allows only one concurrent decision and one concurrent code exchange', async () => {
    const req = await browserRequest();
    const decision = (await import('@/pages/api/auth/oauth2/code/decision')).default;
    const decisions = await Promise.all([call(decision, req), call(decision, req)]);
    expect(decisions.map((r) => r.statusCode).sort()).toEqual([200, 400]);
    const code = new URL(
      decisions.find((r) => r.statusCode === 200)!.body.redirect_uri
    ).searchParams.get('code')!;
    const body = {
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier
    };
    const results = await Promise.all([exchange(body), exchange(body)]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 400]);
    expect(results.find((r) => r.statusCode === 400)!.body.error).toBe('invalid_grant');
  });
  it('rejects mismatched PKCE and redirect without consuming the valid grant', async () => {
    const body = await grant();
    expect((await exchange({ ...body, code_verifier: 'a'.repeat(43) })).body.error).toBe(
      'invalid_grant'
    );
    expect((await exchange({ ...body, redirect_uri: 'io.sealos.desktop:/other' })).body.error).toBe(
      'invalid_grant'
    );
    expect((await exchange({ ...body, code_verifier: '' })).body.error).toBe('invalid_request');
    expect(
      (await exchange(new URLSearchParams(body).toString() + '&code_verifier=duplicate')).body.error
    ).toBe('invalid_request');
    expect((await exchange(body)).statusCode).toBe(200);
    expect((await exchange(body)).body.error).toBe('invalid_grant');
  });
  it('revokes the session family when an old refresh token is reused', async () => {
    const issued = await exchange(await grant());
    const body = {
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: issued.body.refresh_token
    };
    const rotated = await exchange(body);
    expect(rotated.statusCode).toBe(200);
    expect((await exchange(body)).body.error).toBe('invalid_grant');
    expect(
      (await exchange({ ...body, refresh_token: rotated.body.refresh_token })).body.error
    ).toBe('invalid_grant');
  });
  it('serializes simultaneous refresh requests and commits replay revocation', async () => {
    const issued = await exchange(await grant());
    const body = {
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: issued.body.refresh_token
    };
    const results = await Promise.all([exchange(body), exchange(body)]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 400]);
    const latest = results.find((r) => r.statusCode === 200)!.body.refresh_token;
    expect((await exchange({ ...body, refresh_token: latest })).body.error).toBe('invalid_grant');
  });
  it('disabling new authorizations still permits refresh and revocation', async () => {
    const issued = await exchange(await grant());
    global.AppConfig.desktop.auth.oauth2idp.authorizationCodeEnabled = false;
    try {
      expect((await call(authorize, { query: query() })).statusCode).toBe(503);
      const body = {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: issued.body.refresh_token
      };
      const refreshed = await exchange(body);
      expect(refreshed.statusCode).toBe(200);
      expect(
        (
          await call((await import('@/pages/api/auth/oauth2/code/revoke')).default, {
            method: 'POST',
            body: { client_id: clientId, token: refreshed.body.refresh_token }
          })
        ).statusCode
      ).toBe(200);
    } finally {
      global.AppConfig.desktop.auth.oauth2idp.authorizationCodeEnabled = true;
    }
  });
  it('rejects expired requests and authorization codes', async () => {
    const req = await browserRequest();
    const body = await grant();
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(Date.now() + 601_000);
      expect((await exchange(body)).body.error).toBe('invalid_grant');
      const decision = (await import('@/pages/api/auth/oauth2/code/decision')).default;
      expect((await call(decision, req)).body.error).toBe('invalid_grant');
    } finally {
      vi.useRealTimers();
    }
  });
  it('preserves device authorization and legacy JWT refresh when code flow is off', async () => {
    const legacyId = `${clientId}-device`;
    await db.oAuthClient.create({
      data: {
        clientId: legacyId,
        name: 'Device client',
        allowedGrantTypes: ['urn:ietf:params:oauth:grant-type:device_code']
      }
    });
    try {
      expect(
        (await call(authorize, { query: { ...query(), client_id: legacyId } })).body.error
      ).toBe('unauthorized_client');
      global.AppConfig.desktop.auth.oauth2idp.authorizationCodeEnabled = false;
      const device = (await import('@/pages/api/auth/oauth2/device')).default;
      const context = (await import('@/pages/api/auth/oauth2/authorize/context')).default;
      const decision = (await import('@/pages/api/auth/oauth2/authorize/decision')).default;
      const started = await call(device, {
        method: 'POST',
        body: { client_id: legacyId, scope: 'unchanged-device-scope' }
      });
      expect(started.statusCode).toBe(200);
      expect(started.body.verification_uri).toBe('https://auth.example.test/oauth2/device');
      const tokenBody = {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: legacyId,
        device_code: started.body.device_code
      };
      expect((await exchange(tokenBody)).body.error).toBe('authorization_pending');
      expect((await exchange(tokenBody)).body.error).toBe('slow_down');
      const authorization = sign({ userUid: uid, regionUid: 'test-region' }, 'test-region-secret');
      const ctx = await call(context, {
        query: { user_code: started.body.user_code },
        headers: { authorization }
      });
      expect(
        (
          await call(decision, {
            method: 'POST',
            headers: { authorization },
            body: { request_id: ctx.body.request_id, decision: 'approve' }
          })
        ).body
      ).toEqual({ status: 'approved' });
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.now() + 6000);
      const issued = await exchange(tokenBody);
      expect(issued.statusCode).toBe(200);
      expect(issued.body.refresh_token.split('.')).toHaveLength(3);
      const refreshBody = {
        grant_type: 'refresh_token',
        client_id: legacyId,
        refresh_token: issued.body.refresh_token
      };
      expect((await exchange(refreshBody)).statusCode).toBe(200);
      expect((await exchange(refreshBody)).statusCode).toBe(200); // Existing non-rotating behavior.
    } finally {
      vi.useRealTimers();
      global.AppConfig.desktop.auth.oauth2idp.authorizationCodeEnabled = true;
      await db.oAuthClient.delete({ where: { clientId: legacyId } });
    }
  });
  it('delivers the code to a registered loopback client with a dynamic port', async () => {
    const { createServer } = await import('node:http');
    let received: URL | undefined;
    const server = createServer((req, res) => {
      received = new URL(req.url!, 'http://127.0.0.1');
      res.end('Signed in');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as import('node:net').AddressInfo).port;
    const loopbackId = `${clientId}-loopback`;
    const callbackUri = `http://127.0.0.1:${port}/callback`;
    await db.oAuthClient.create({
      data: {
        clientId: loopbackId,
        name: 'Loopback',
        allowedGrantTypes: ['authorization_code', 'refresh_token'],
        redirectUris: ['http://127.0.0.1/callback']
      }
    });
    try {
      const started = await call(authorize, {
        query: { ...query(), client_id: loopbackId, redirect_uri: callbackUri }
      });
      expect(started.statusCode).toBe(302);
      const [name, value] = started.headers['Set-Cookie'].split(';')[0].split('=');
      const id = new URL(started.headers.Location, 'https://auth.example.test').searchParams.get(
        'request_id'
      );
      const decision = (await import('@/pages/api/auth/oauth2/code/decision')).default;
      const approved = await call(decision, {
        method: 'POST',
        body: { request_id: id, decision: 'approve' },
        cookies: { [name]: value },
        headers: {
          origin: 'https://auth.example.test',
          'content-type': 'application/json',
          authorization: sign({ userUid: uid, regionUid: 'test-region' }, 'test-region-secret')
        }
      });
      await fetch(approved.body.redirect_uri);
      expect(received!.searchParams.get('state')).toBe('test-state');
      const body = {
        grant_type: 'authorization_code',
        client_id: loopbackId,
        redirect_uri: callbackUri,
        code: received!.searchParams.get('code')!,
        code_verifier: verifier
      };
      expect((await exchange({ ...body, client_id: clientId })).body.error).toBe('invalid_grant');
      expect((await exchange(body)).statusCode).toBe(200);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await db.oAuthAuthorizationRequest.deleteMany({ where: { clientId: loopbackId } });
      await db.oAuthRefreshSession.deleteMany({ where: { clientId: loopbackId } });
      await db.oAuthClient.delete({ where: { clientId: loopbackId } });
    }
  });
  it('limits only new endpoints and does not create requests when throttled', async () => {
    const identity = randomUUID();
    const req = {
      query: { ...query(), client_id: 'missing-client' },
      socket: { remoteAddress: identity }
    };
    for (let i = 0; i < 120; i++) expect((await call(authorize, req)).statusCode).toBe(400);
    expect((await call(authorize, req)).statusCode).toBe(429);
  });
  it.skipIf(cockroach)(
    'rolls back code consumption when storing the refresh session fails',
    async () => {
      const body = await grant();
      await db.$executeRawUnsafe(
        `CREATE FUNCTION oauth_test_reject_session() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test write failure'; END; $$`
      );
      await db.$executeRawUnsafe(
        `CREATE TRIGGER oauth_test_reject_session BEFORE INSERT ON "OAuthRefreshSession" FOR EACH ROW EXECUTE FUNCTION oauth_test_reject_session()`
      );
      try {
        expect((await exchange(body)).statusCode).toBe(500);
      } finally {
        await db.$executeRawUnsafe(
          `DROP TRIGGER oauth_test_reject_session ON "OAuthRefreshSession"`
        );
        await db.$executeRawUnsafe(`DROP FUNCTION oauth_test_reject_session()`);
      }
      expect((await exchange(body)).statusCode).toBe(200);
    }
  );
  it('revokes one session without affecting another and rejects expired refresh tokens', async () => {
    const first = await exchange(await grant());
    const second = await exchange(await grant());
    const revoke = (await import('@/pages/api/auth/oauth2/code/revoke')).default;
    await call(revoke, {
      method: 'POST',
      body: { client_id: clientId, token: first.body.refresh_token }
    });
    const refresh = (refresh_token: string) =>
      exchange({ grant_type: 'refresh_token', client_id: clientId, refresh_token });
    expect((await refresh(first.body.refresh_token)).body.error).toBe('invalid_grant');
    const refreshed = await refresh(second.body.refresh_token);
    expect(refreshed.statusCode).toBe(200);
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(Date.now() + 31 * 86400_000);
      expect((await refresh(refreshed.body.refresh_token)).body.error).toBe('invalid_grant');
    } finally {
      vi.useRealTimers();
    }
  });
  it('rejects literal wildcard callbacks even when they were registered', async () => {
    const wildcardId = `${clientId}-wildcard`;
    const redirect_uri = 'https://example.test/*';
    await db.oAuthClient.create({
      data: {
        clientId: wildcardId,
        name: 'Bad registration',
        allowedGrantTypes: ['authorization_code', 'refresh_token'],
        redirectUris: [redirect_uri]
      }
    });
    try {
      const result = await call(authorize, {
        query: { ...query(), client_id: wildcardId, redirect_uri }
      });
      expect(result.statusCode).toBe(400);
      expect(result.headers.Location).toBeUndefined();
    } finally {
      await db.oAuthAuthorizationRequest.deleteMany({ where: { clientId: wildcardId } });
      await db.oAuthClient.delete({ where: { clientId: wildcardId } });
    }
  });
});
