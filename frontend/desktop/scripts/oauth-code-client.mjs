import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';

const [originArg, clientId] = process.argv.slice(2);
if (!originArg || !clientId)
  throw new Error('Usage: node oauth-code-client.mjs <sealos-origin> <client-id>');
const origin = new URL(originArg).origin;
if (!origin.startsWith('https://') && !/^http:\/\/(127\.0\.0\.1|localhost)(:|$)/.test(origin))
  throw new Error('Use HTTPS for Sealos.');
const state = randomBytes(32).toString('base64url');
const verifier = randomBytes(32).toString('base64url');
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
const post = async (path, params) => {
  const response = await fetch(new URL(path, origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, ...params }),
    signal: AbortSignal.timeout(15000)
  });
  const text = await response.text();
  return { ok: response.ok, data: text ? JSON.parse(text) : {} };
};
let processing = false;
const timeout = setTimeout(() => {
  console.error('Authorization timed out.');
  server.close();
  process.exitCode = 1;
}, 600000);
server.on('request', async (req, res) => {
  const callback = new URL(req.url, redirectUri);
  if (callback.pathname !== '/callback' || callback.searchParams.get('state') !== state) {
    res.writeHead(400).end('Invalid callback');
    return;
  }
  if (processing) {
    res.writeHead(409).end('Already processing');
    return;
  }
  processing = true;
  res.setHeader('Cache-Control', 'no-store');
  res.end('You can return to the terminal.');
  try {
    if (callback.searchParams.has('error'))
      throw new Error(`Authorization denied: ${callback.searchParams.get('error')}`);
    const issued = await post('/api/auth/oauth2/token', {
      grant_type: 'authorization_code',
      code: callback.searchParams.get('code') || '',
      redirect_uri: redirectUri,
      code_verifier: verifier
    });
    if (!issued.ok) throw new Error(`Code exchange failed: ${issued.data.error}`);
    const refreshed = await post('/api/auth/oauth2/token', {
      grant_type: 'refresh_token',
      refresh_token: issued.data.refresh_token
    });
    if (!refreshed.ok) throw new Error(`Refresh failed: ${refreshed.data.error}`);
    const revoked = await post('/api/auth/oauth2/code/revoke', {
      token: refreshed.data.refresh_token
    });
    if (!revoked.ok) throw new Error(`Revocation failed: ${revoked.data.error}`);
    const rejected = await post('/api/auth/oauth2/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshed.data.refresh_token
    });
    if (rejected.ok || rejected.data.error !== 'invalid_grant')
      throw new Error('Revoked token still usable');
    console.log(
      'Passed: callback state, PKCE exchange, refresh, revocation. No credentials saved.'
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    server.close();
  }
});
const url = new URL('/api/auth/oauth2/code/authorize', origin);
url.search = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  state,
  code_challenge: createHash('sha256').update(verifier).digest('base64url'),
  code_challenge_method: 'S256'
}).toString();
console.log(`Open in your system browser:\n${url}`);
