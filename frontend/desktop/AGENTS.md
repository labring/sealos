# Sealos Desktop Frontend Agent Guide

## Project Overview

This directory is the Next.js frontend and API layer for Sealos Desktop. It owns
the browser desktop shell, sign-in flow, account settings, workspace/team UI,
installed app launch surfaces, notification/task panels, and selected `/api/*`
routes that talk to global and regional Sealos services.

## Basic Rules

- Keep UI changes scoped to the visible surface named by the task. Workspace
  labels, account settings, and shared menus are reused across several entry
  points.
- Do not run database write operations manually. API code may define database
  writes, but local validation should use unit tests or code review unless the
  user explicitly asks for a database mutation.
- Preserve user and session authority boundaries. Global user display profile is
  `nickname` and `avatarUri`; immutable login identity remains `name`/`userId`.
- The private/default workspace is a fixed personal workspace. Display it with
  `common:default_team` and avoid exposing rename or dissolve actions for it.
- The protected admin account must not enter account-delete flows. Guard both
  frontend controls and backend delete API routes.
- Keep locale additions in both `public/locales/zh/common.json` and
  `public/locales/en/common.json`.
- Do not stage unrelated generated files from sibling workspaces such as
  `frontend/providers/devbox/prisma/generated`.

## Run Commands

```bash
pnpm run dev
pnpm lint
pnpm test:ci
pnpm build
```

If the package manager or Node.js runtime is out of sync, prefer the local
installed binaries for verification:

```bash
./node_modules/.bin/next lint
./node_modules/.bin/jest --runInBand
```

## Environment Notes

- Development normally expects `.env.local` because `pnpm run dev` runs
  `dotenv -e .env.local next dev`.
- Local sign-in often needs a copied Sealos session from a live environment; see
  `README.md` for the browser-storage based workflow.
- Deployment configuration is documented under `deploy/`, especially
  `deploy/README.md` and `deploy/HELM_VALUES_GUIDE.md`.

## Account And Workspace Invariants

- Account profile editing writes only the current authenticated user through
  `/api/auth/profile/update`.
- Avatar values may be empty, relative paths, `http(s)` URLs, or existing
  `data:image/*` values.
- Account deletion routes must reject the admin account before balance checks,
  resource checks, force-delete code validation, or delete transactions.
- The default personal workspace can be selected and viewed, but cannot be
  renamed, dissolved, or abdicated.
