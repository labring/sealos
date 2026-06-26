# Runbook

## Local Setup

```bash
pnpm install
pnpm run dev
```

`pnpm run dev` runs `dotenv -e .env.local next dev`, so local development should
provide `.env.local` when backend/API routes are exercised.

Open http://localhost:3000 after the dev server starts.

## Verification

Preferred project commands:

```bash
pnpm lint
pnpm test:ci
pnpm build
```

Targeted checks that work when pnpm or Node.js engines are mismatched:

```bash
./node_modules/.bin/next lint
./node_modules/.bin/jest --runInBand
./node_modules/.bin/jest src/__tests__/unit/backend/profile.test.ts src/__tests__/unit/protectedUser.test.ts --runInBand
git diff --check
```

Full TypeScript checking can be attempted with:

```bash
../node_modules/.bin/tsc --noEmit --pretty false -p tsconfig.json
```

If it fails, separate environment or unrelated existing test-fixture errors from
the feature under review before treating it as a product regression.

## Prisma Generation

```bash
pnpm gen:global
pnpm gen:region
pnpm gen:postgresql
pnpm gen:all
```

Do not run migrations or database writes without explicit user approval.

## Local Auth Notes

The sign-in page may depend on a live Sealos environment. For local frontend
debugging, copy a valid Sealos browser session from a live environment into the
localhost browser storage as described in `README.md`.

## Account Profile Smoke Checklist

- Open account settings.
- Click the profile edit action.
- Change nickname and/or avatar URI.
- Confirm and check for the success toast.
- Confirm the account menu display name/avatar updates without changing
  immutable `userId`.

## Admin Delete Protection Checklist

- For a protected admin session, opening delete account should show the forbidden
  message and no destructive confirm button.
- The frontend should not request account balance/resource preflight for admin.
- Backend routes `/api/auth/delete`, `/api/auth/delete/checkAllResource`, and
  `/api/auth/delete/force` should return API code `403` before delete services
  run.

## Deploy

Deployment docs live under `deploy/`:

```bash
sealos run desktop-frontend:latest
sealos run desktop-frontend:latest -e CLOUD_DOMAIN=cloud.example.com
```

For production image publication, build linux/amd64 images unless the user asks
for another architecture.
