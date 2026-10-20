# OAuth release-v5.1 backport

Source baseline: `origin/main` at `ff4bf4f85`; target baseline: `8e7734121`.

## Source commits

- `964244818` / #6770: device authorization and global token support.
- `f945413f2` / #7333: authorization code with PKCE.
- `826a7b60b` / #6789: restore legacy token compatibility for real-name authentication.
- `8b8fc465c` / #6792: preserve external services' legacy token claim contract.

The OAuth pages, API routes, services, schemas and redirect utilities match the source baseline. The `requestIp.ts` dependency is copied from the same baseline.

## Release adaptations

- Keep manual workspace initialization and resume pending OAuth authorization after it completes. Existing users resume authorization after regional session setup.
- Keep release-specific login diagnostics, invitation settings, kubeconfig encoding and external OAuth login configuration.
- Do not restore `verifySharedToken.ts`: the target branch does not have that endpoint or the shared-cookie session flow it depends on.
- Use the existing shared shadcn components. Generate utilities only for OAuth pages and their components, nested under `.oauth2-page`, without global Tailwind Preflight. Theme mappings come from the shared shadcn stylesheet.
- Preserve Jest for existing tests. Use Vitest separately for the imported authorization-code integration/component tests; pin its tooling to versions resolved in main. Adapt the component test's router import for Next 13.
- Preserve existing lockfile resolutions and add the necessary dependency entries.

## Validation on this backport

- All four Prisma clients generated; no database migration executed.
- TypeScript passed on Node 20.4.0.
- Ten Jest suites passed: 58 tests passed, two upstream TODO tests remain.
- Frozen-lockfile installation passed.
- Local Next development compilation and agent-browser checks passed for device-page rendering, authorization-code sign-in redirection with pending request retention, and the consent page/approval navigation using mocked API responses.
- The 28 database integration tests were skipped because no isolated database was configured. No database writes were performed.
- The Vitest browser component suite did not run successfully because its Chromium executable was unavailable. Browser checks above used agent-browser instead.
- Production build, real database grant exchanges, native clients and deployed environments were not validated.

Run focused non-database tests with `pnpm --dir frontend/desktop test:oauth`. The original authorization-code integration instructions remain in `oauth-authorization-code.md`; their historical verification statements describe upstream work, not acceptance of this backport. Vite 7 tooling requires a newer Node version than the repository's Node 20.4.0 pin; the Vitest skip check was performed on Node 23.11.0.
