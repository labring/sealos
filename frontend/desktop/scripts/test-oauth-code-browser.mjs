// Runs the actual Next pages and OAuth APIs against an isolated PostgreSQL database.
// Account login/region APIs are fixtures; no external IdP or Kubernetes cluster is contacted.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const { PrismaClient } = require('../prisma/providers/postgresql/global/generated/client');
const { sign } = require('jsonwebtoken');
const databaseUrl = process.env.OAUTH_TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'OAUTH_TEST_DATABASE_URL must point to a migrated disposable PostgreSQL database.'
  );
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const uid = randomUUID();
const clientId = `browser-${uid}`;
const callback = createServer((req, res) => res.end('Returned to native client'));
await new Promise((resolve) => callback.listen(0, '127.0.0.1', resolve));
const redirectUri = `http://127.0.0.1:${callback.address().port}/callback`;
const reserve = createServer();
await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const temp = await mkdtemp(join(tmpdir(), 'sealos-oauth-browser-'));
const config = {
  cloud: { domain: '127.0.0.1', port: String(port), regionUID: 'browser-test' },
  desktop: {
    auth: {
      callbackURL: origin,
      jwt: { global: 'browser-test-global', regional: 'browser-test-regional' },
      oauth2idp: { enabled: true, authorizationCodeEnabled: true }
    }
  }
};
await writeFile(join(temp, 'config.yaml'), JSON.stringify(config));
const desktop = dirname(dirname(fileURLToPath(import.meta.url)));
const child = spawn(
  process.execPath,
  [require.resolve('next/dist/bin/next'), 'dev', '-p', String(port), '-H', '127.0.0.1'],
  {
    cwd: desktop,
    env: {
      ...process.env,
      GLOBAL_DATABASE_URL: databaseUrl,
      REGION_DATABASE_URL: databaseUrl,
      PRISMA_DB_PROVIDER: 'postgresql',
      CONFIG_PATH: join(temp, 'config.yaml')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  }
);
let serverOutput = '';
for (const stream of [child.stdout, child.stderr])
  stream.on('data', (chunk) => {
    serverOutput = (serverOutput + chunk.toString()).slice(-20000);
  });
let browser;
try {
  await db.user.create({
    data: { uid, id: uid, name: uid, nickname: 'Browser Alice', avatarUri: '' }
  });
  await db.oAuthClient.create({
    data: {
      clientId,
      name: 'Browser Desktop',
      redirectUris: ['http://127.0.0.1/callback'],
      allowedGrantTypes: [
        'authorization_code',
        'refresh_token',
        'urn:ietf:params:oauth:grant-type:device_code'
      ]
    }
  });
  const deadline = Date.now() + 90000;
  while (!serverOutput.includes('Ready in')) {
    if (child.exitCode !== null || Date.now() > deadline)
      throw new Error(`Next failed to start: ${serverOutput}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  const regionalToken = sign(
    {
      userUid: uid,
      userId: uid,
      regionUid: 'browser-test',
      workspaceId: 'test-workspace',
      workspaceUid: uid,
      userCrUid: uid,
      userCrName: 'test-user'
    },
    'browser-test-regional'
  );
  const globalToken = sign(
    { sub: uid, user_id: uid, token_type: 'access_token' },
    'browser-test-global'
  );
  const publicConfig = {
    cloud: config.cloud,
    common: {},
    tracking: {},
    desktop: {
      layout: { meta: { title: 'Sealos' }, protocol: { serviceProtocol: {}, privateProtocol: {} } },
      auth: {
        callbackURL: origin,
        idp: {
          password: { enabled: true },
          email: {},
          sms: {},
          google: {},
          github: {},
          wechat: {},
          oauth2: {}
        },
        captcha: { ali: {}, turnstile: {} }
      }
    }
  };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/api/auth/oauth2/')) return route.continue();
    let data = {};
    if (path === '/api/platform/getAppConfig') data = publicConfig;
    if (path === '/api/auth/password') data = { token: globalToken, needInit: false };
    if (path === '/api/auth/regionToken')
      data = { token: regionalToken, appToken: regionalToken, kubeconfig: '' };
    if (path === '/api/auth/info')
      data = { info: { nickname: 'Browser Alice', avatarUri: '', oauthProvider: [] } };
    if (path === '/api/plan/info') data = { subscription: null };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, data })
    });
  });
  const authorizationUrl = () => {
    const url = new URL('/api/auth/oauth2/code/authorize', origin);
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: 'browser-state',
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      code_challenge_method: 'S256'
    });
    return url.toString();
  };
  await page.goto(authorizationUrl());
  await page.waitForURL('**/signin?oauth_code_request_id=*');
  const requestId = new URL(page.url()).searchParams.get('oauth_code_request_id');
  await page.getByRole('button', { name: 'Username / Password Signin' }).click();
  await page.locator('input[name="username"]').fill('browser-user');
  await page.locator('input[name="password"]').fill('test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(`${origin}/oauth2/code?request_id=${requestId}`);
  await page.getByText('Browser Alice', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.waitForURL(`${redirectUri}?**`);
  let returned = new URL(page.url());
  assert.equal(returned.searchParams.get('state'), 'browser-state');
  assert.ok(returned.searchParams.get('code'));
  console.log('Passed: sign-in UI resumes the request and approval navigates to the client.');
  await page.goto(authorizationUrl());
  await page.getByRole('button', { name: 'Deny', exact: true }).click();
  await page.waitForURL(`${redirectUri}?**`);
  returned = new URL(page.url());
  assert.equal(returned.searchParams.get('error'), 'access_denied');
  assert.equal(returned.searchParams.get('state'), 'browser-state');
  console.log('Passed: denial navigates to the client with error and state.');
  const deviceResponse = await context.request.post(`${origin}/api/auth/oauth2/device`, {
    form: { client_id: clientId }
  });
  const device = await deviceResponse.json();
  await page.goto(device.verification_uri_complete);
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page
    .getByText('Authorization approved. You can return to your device.', { exact: true })
    .waitFor();
  assert.equal(new URL(page.url()).pathname, '/oauth2/consent');
  console.log('Passed: device flow retains its original completion page.');
} catch (error) {
  console.error(serverOutput);
  throw error;
} finally {
  await browser?.close();
  child.kill('SIGTERM');
  await new Promise((resolve) => callback.close(resolve));
  await db.oAuthAuthorizationRequest.deleteMany({ where: { clientId } });
  await db.oAuthRefreshSession.deleteMany({ where: { clientId } });
  await db.oAuthClient.deleteMany({ where: { clientId } });
  await db.user.deleteMany({ where: { uid } });
  await db.$disconnect();
  await rm(temp, { recursive: true, force: true });
}
