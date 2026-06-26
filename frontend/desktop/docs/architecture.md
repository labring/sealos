# Architecture

## Runtime Shape

Sealos Desktop Frontend is a Next.js 13 application. It combines React pages,
Chakra UI components, Zustand stores, TanStack Query data fetching, and Next API
routes under one deployment.

The browser layer renders the desktop shell and calls local `/api/*` routes.
Those API routes verify Sealos access tokens, read global or regional Prisma
clients, and call Kubernetes or platform services when needed.

## Main Modules

- `src/pages/_app.tsx`: application bootstrap, Chakra provider, query provider,
  and app-wide wrappers.
- `src/pages/index.tsx`: authenticated desktop entry.
- `src/pages/signin.tsx`, `src/pages/callback.tsx`, `src/pages/proxyOAuth.tsx`:
  sign-in and OAuth callback surfaces.
- `src/components/desktop_content/`: desktop background and app-launch content.
- `src/components/account/`: account menu, account settings, identity binding,
  real-name flows, and deletion UI.
- `src/components/team/`: workspace switcher, team center, member management,
  rename/dissolve/abdicate controls.
- `src/stores/session.ts`: persisted session, token, and active user metadata.
- `src/stores/config.ts`: runtime cloud/common/layout/auth configuration.
- `src/services/request.ts`: Axios instance that attaches access tokens and
  rejects non-2xx API response codes.
- `src/services/backend/`: API-side auth, database, Kubernetes, service, and
  middleware helpers.
- `prisma/global` and `prisma/region`: Prisma schemas and generated clients for
  global and regional data.

## Auth And Session Flow

1. Sign-in produces an access token and app token.
2. `src/utils/sessionConfig.ts` calls `/api/auth/info`, decodes the access token,
   and stores a `Session` in `useSessionStore`.
3. Browser API calls include the access token through `src/services/request.ts`.
4. API routes use `verifyAccessToken` or `filterAccessToken` before reading or
   mutating user-scoped data.

Global `User.name` is the immutable unique login identity used as `userId` in
tokens. Global `User.nickname` and `User.avatarUri` are display profile fields.

## Account Profile Editing

`src/components/account/AccountCenter/index.tsx` lets users edit nickname and
avatar URI inline. It calls `updateUserProfile` in `src/api/auth.ts`, which posts
to `/api/auth/profile/update`.

The API route validates the current access token, validates request data with
`validateProfileUpdate`, and updates only the authenticated global user by
`payload.userUid`. It returns selected profile fields and the UI updates the
persisted session display name/avatar after success.

## Account Deletion

Account deletion is intentionally multi-step:

1. The UI requests balance and resource state.
2. `/api/auth/delete/checkAllResource` checks remaining resources and may return
   a one-time force-delete code.
3. `/api/auth/delete` or `/api/auth/delete/force` creates delete transactions via
   backend services after all guards pass.

The admin account is protected in both UI and API routes through
`isProtectedAdminUser`. The API guard runs before balance/resource checks and
before delete transactions.

## Workspace Management

Workspace data comes from namespace API routes and TanStack Query caches. Private
workspace records are identified by `NSType.Private` or `isPrivate`. The private
workspace is displayed with `common:default_team`; team-only controls such as
rename, dissolve, and abdicate are hidden or disabled.

## Configuration And Deployment

Deployment is driven by `deploy/charts/desktop-frontend`. The runtime config is
assembled into `/app/data/config.yaml` and served by platform API routes such as
`/api/platform/getLayoutConfig`, `/api/platform/getCommonConfig`, and
`/api/platform/getAuthConfig`.

Helm and environment override behavior is documented under `deploy/`.
