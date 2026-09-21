# Authorization code + PKCE for native clients

This is an OAuth 2.0 authorization server capability in Web Desktop. It does not migrate the native desktop/mobile apps. Device authorization, existing JWT refresh tokens, and their consent routes retain their current behavior.

## Enable and register

Deploy the new global database migration before enabling the flow. Use the migration directory for the configured provider (CockroachDB or PostgreSQL), then regenerate its Prisma client. The PostgreSQL migration also adds the existing OAuth models missing from that provider's schema.

In the Desktop server configuration, set `desktop.auth.oauth2idp.enabled: true` and `desktop.auth.oauth2idp.authorizationCodeEnabled: true`. The second flag defaults to false. Configure `desktop.auth.callbackURL` with the correct public HTTPS origin; decision requests compare their Origin header against it. Disabling only the new flag blocks authorization and code exchange but permits existing code-flow refresh sessions to refresh or revoke.

Register one PUBLIC OAuthClient per native app. Set `allowedGrantTypes` to include `authorization_code` and `refresh_token`, and populate `redirectUris`. No client secret is required. Existing device clients need no changes. A client may explicitly allow both device and code grants.

Allowed callbacks: exact registered HTTPS URIs; private schemes with reverse-domain naming, such as `io.sealos.mobile:/oauth/callback`; or HTTP loopback IPs `127.0.0.1` / `[::1]`. Only a loopback callback's port may vary. Wildcards, fragments, userinfo and non-loopback HTTP callbacks are not supported. Register loopback without a port, for example `http://127.0.0.1/callback`. Configure mobile OS callback routing separately; verified HTTPS app links require domain association.

## Protocol

1. Generate a fresh cryptographically random state and a 43–128 character verifier for each attempt. Compute `BASE64URL(SHA256(verifier))` without padding.
2. Open the system browser at `GET /api/auth/oauth2/code/authorize` with `response_type=code`, `client_id`, `redirect_uri`, `state`, `code_challenge`, and `code_challenge_method=S256`. Do not request scopes in this release: nonempty scope returns `invalid_scope`.
3. The server creates a ten-minute browser-bound request and opens `/oauth2/code`. Existing sign-in methods resume that request after login. The browser must retain the HttpOnly request cookie. Consent shows the current account and existing account-level access.
4. Approval redirects to the registered callback with `code` and the original `state`. Denial redirects with `error=access_denied` and `state`. Reject any callback whose state does not match the initiating attempt. Codes expire after five minutes and are single-use.
5. POST form-urlencoded to `/api/auth/oauth2/token`: `grant_type=authorization_code`, `client_id`, `redirect_uri` (identical to the original), `code`, `code_verifier`.
6. Response: `access_token`, `refresh_token`, `token_type=Bearer`, `expires_in=3600`. No ID token is issued. The access token uses Sealos's existing global token format; existing regional/workspace credential exchange still applies. Use each Sealos business API's existing authorization-header convention rather than assuming every legacy endpoint parses a Bearer prefix.

The native app should store credentials in its OS secure store. Serialize refresh calls: POST `grant_type=refresh_token`, `client_id`, `refresh_token` to the same token endpoint. Always replace the stored refresh token with the latest response. New code-flow refresh tokens are opaque (`sc_rt_` prefix), rotate on each use, and expire after 30 days without a successful refresh. Reusing a consumed token revokes its entire session family, including the newest token. A lost refresh response therefore requires signing in again; do not automatically replay the old token. Other sessions are independent.

To log out, POST form-urlencoded `client_id` and `token` to `/api/auth/oauth2/code/revoke`. The new session family cannot refresh afterward. Unknown or already revoked tokens return HTTP 200. This endpoint does not revoke device-flow tokens. Outstanding access tokens may remain usable for up to one hour; previously exported kubeconfigs are not revoked. This is not immediate account-wide logout.

## Compatibility and operation

- Device endpoints, device pages and device refresh logic are unchanged. No new scope enforcement is applied to them.
- New endpoints share a database-backed limit of 120 requests per minute per client IP. IP extraction follows the existing trusted Higress convention: prevent callers bypassing the ingress and injecting trusted IP headers.
- Expired new authorization requests, expired refresh families (including consumed token hashes) and limiter buckets are pruned opportunistically, at most once per minute per worker. Cleanup failure is retried on subsequent requests. Consumed refresh hashes are retained while their family is active so replay is detectable.
- New schema changes are additive. To stop new adoption, disable the authorization-code flag rather than removing tables needed by active sessions.
- OIDC, fine-grained scopes, workspace selection, a client-registration UI and an authorized-app management UI are deferred.

## Verification

Run the existing Desktop unit suite normally. The OAuth code integration suite uses `OAUTH_TEST_DATABASE_URL` exclusively and is skipped without it. Set `OAUTH_TEST_DB_PROVIDER=cockroachdb` to run the same contracts against a disposable CockroachDB database; the PostgreSQL-only failure-injection trigger test is skipped there. Prepare a disposable PostgreSQL database with this provider's migrations; do not point it at application data. The test creates uniquely named clients/users and deletes them afterward. Its API-boundary tests run actual services, JWT verification, PKCE checks and database transactions, including concurrent code/refresh requests and a real HTTP loopback callback.

From the frontend workspace, in fish:

```fish
env GLOBAL_DATABASE_URL="$OAUTH_TEST_DATABASE_URL" pnpm --dir desktop exec prisma migrate deploy --schema prisma/providers/postgresql/global/schema.prisma
env OAUTH_TEST_DATABASE_URL="$OAUTH_TEST_DATABASE_URL" pnpm --dir desktop exec vitest run src/__tests__/integration/oauth-code.test.ts --project unit
pnpm --dir desktop exec vitest run src/__tests__/components/oauth-code.test.tsx --project components
pnpm --dir desktop exec tsc --noEmit
```

For a manual reference-client smoke test, run `node desktop/scripts/oauth-code-client.mjs https://your-sealos-host registered-client-id`. Register `http://127.0.0.1/callback` for that test client first. The script prints a browser link, receives the callback, exchanges and refreshes the token, revokes the session, and verifies further refresh is denied. It never prints tokens or persists credentials. On mobile, use the same authorization/token parameters with that app's registered callback and system authentication browser.

### Browser smoke test

`env OAUTH_TEST_DATABASE_URL="$OAUTH_TEST_DATABASE_URL" node desktop/scripts/test-oauth-code-browser.mjs` starts an isolated Next development server and Chromium. It exercises the real sign-in UI, resumes the pending request, verifies successful approve/deny navigation to a real loopback callback, and verifies the existing device completion page. Account login and regional credential APIs return fixture credentials; OAuth APIs, cookies, database state and browser navigation are real. It never contacts an external identity provider or Kubernetes API. The script closes its server/browser and deletes its uniquely named fixtures on completion.

Both PostgreSQL migrations from an empty database and the CockroachDB additive migration from the previous schema were exercised against disposable databases, with no schema drift afterward.
