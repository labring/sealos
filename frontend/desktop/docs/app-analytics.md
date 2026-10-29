# App analytics and website Cookie handoff

The App uses existing China Rybbit and Global Web GTM `GTM-5DTRN2V3` → GA4
`G-YF5VHZSTE0`. Its isolated local HTTP analytics page hosts Web GTM; the main
UI stays `file://`. No sGTM service, Measurement Protocol endpoint or API secret.

```text
Consented website visit → sealos_acquisition_v1 shared-domain Cookie
 → ordinary installer download → App opens console OAuth in system browser
 → console reads Cookie + verifies logged-in userUid + approved authorization
 → signed analytics_token through existing redirect and PKCE code exchange
 → optional analytics_context in token response → App stores in local auth JSON
 → Web / App emit visitor_linked to their existing statistics destination
```

`visitor_id` is a website-generated UUID, not a built-in GA identifier. The App
installation ID / GA client ID remains separate from the website CID. Both sides
use raw verified `userUid`; realm and workspace are separate dimensions. This
does not merge China and Global accounts. No new table, column, migration,
attribution service or durable queue is added. Existing OAuth tables retain
their original authentication role. The previous MP endpoint and Helm settings
have been removed from this PR.

## Optional, bounded handoff

- Official root/www websites write the Cookie only with analytics permission:
  Domain=sealos.io or sealos.run, Path=/, Secure, SameSite=Lax, 30 days. No auth
  token or user UID enters that wide Cookie. JSON is UTF-8 base64url without
  padding, at most 1800 decoded bytes. Source URLs exclude query/fragment and
  credentials. sea_attr retains original bytes, at most 512 chars, only with all
  three ad permissions granted; existing website sea_attr URLs are unchanged.
- Official native clients `sealos-io` / `sealox-desktop-bja`, configured HTTPS
  sealos.io/sealos.run authority and `analytics_consent=granted` opt in. Optional
  `analytics_installation_id` is validated; absence never blocks login.
- Authorize sets a host-only, HttpOnly request Cookie lasting 10 minutes.
  Approval rechecks current website Cookie and authenticates through normal
  OAuth. The 5-minute receipt binds request ID, client, state hash, realm and
  verified subject with HS256, a purpose-derived signing key and distinct issuer/audience. Missing/default
  signing keys disable only attribution.
- Exchange still requires the original one-use code and PKCE. A receipt has no
  authentication privileges. Missing, invalid, expired metadata leaves login
  successful and unmatched. Denial never links. Refresh does not mint new
  attribution; App retains metadata only for the same account/realm, clearing
  on fresh unmatched login, account change or detailed-statistics withdrawal.
- Cookie fields and consent are browser observations, not proof of acquisition
  or verified ad consent. They cannot authorize accounts, rewards or billing.
  App advertising permissions remain denied.

The approved Web event preserves browser CID; App preserves its own CID. Both
carry the verified UID and visitor_id. This supplies join keys and post-login
User-ID, not a guarantee of historical GA4 session rewrites or default ad
attribution. Configure GA4 reporting identity/custom dimensions separately.
Rybbit historical identity merging must be checked against the deployed version.

Different browser/profile/device, private mode, expiry, denied consent or blocked
storage remains unmatched. Root/www localStorage is origin-specific; withdrawal
is not guaranteed across origins/devices. No fingerprint/probabilistic fallback.

## Review and rollout

The incremental GTM import is in `packages/gtm/integrations/desktop-app/`.
Review/import/publish it into the existing Web container for the new App events;
existing Web triggers are preserved. No live GTM configuration was changed.
The App blocks unrelated analytics destinations. Existing advertising conversion
tags are not enabled for native traffic by this change.

Unit tests cover malformed/oversized Cookie, consent withdrawal, client/realm/
request/state/subject binding, expiry, tampering, denial, PKCE, code replay,
old App compatibility and successful login with invalid metadata. Database
integration tests require an explicitly isolated `OAUTH_TEST_DATABASE_URL`;
never use production. There are no new database settings or Secrets to deploy.

Release acceptance still requires actual browser + packaged App journeys in both
editions after code/GTM publication: visit/download/login, matching visitor ID,
separate CIDs, matching UID, account/realm switching and negative cases. Inspect
actual Rybbit/GA4 reports; script loading/HTTP success does not prove reporting.
Client deployment events are activity, not authoritative signup/payment facts.
Brain changes are not required for this scope.
