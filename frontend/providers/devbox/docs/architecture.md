# Devbox Provider Architecture

## Overview

Devbox is a Next.js provider application in the Sealos frontend workspace. It
combines React pages, provider API routes, Kubernetes clients, Prisma-backed
template storage, and shared Sealos UI packages.

## Main Layers

- `app/[lang]/(platform)/(home)` renders the DevBox list.
- `app/[lang]/(platform)/devbox/create` renders both create and edit flows.
- `app/[lang]/(platform)/devbox/detail/[name]` renders detail, network, release,
  monitoring, logs, and sidebar surfaces for one DevBox.
- `components/` contains shared dialogs, drawers, IDE buttons, charts, and
  template controls.
- `stores/` contains Zustand stores for DevBox, env, runtime, IDE, price, guide,
  and related frontend state.
- `api/` contains browser-side request wrappers.
- `app/api/` contains Next.js route handlers that talk to Kubernetes, Prisma,
  account, monitor, retag, and platform services.
- `utils/json2Yaml.ts` converts Devbox form data into Kubernetes manifests.
- `services/backend/kubernetes.ts` prepares Kubernetes clients from the current
  session.
- `services/db/init.ts` selects the Prisma client according to
  `DATABASE_PROVIDER`.

## Network And Custom Domain Flow

The create/edit network form lives in
`app/[lang]/(platform)/devbox/create/components/Network.tsx`.

When public access is enabled, the form stores:

- `networkName`
- `portName`
- `port`
- `protocol`
- `openPublicDomain`
- `publicDomain`
- `customDomain`

The custom domain drawer validates ownership before writing `customDomain` into
the form. It does not persist Kubernetes state directly.

Validation order:

1. `components/drawers/CustomAccessDrawer.tsx` calls
   `/api/platform/authCname`.
2. `app/api/platform/authCname/route.ts` verifies that the custom domain has a
   CNAME pointing at the generated public domain.
3. If CNAME verification fails, the drawer calls
   `/api/platform/authDomainChallenge`.
4. `app/api/platform/authDomainChallenge/route.ts` verifies the challenge
   response exposed by the custom domain.
5. If either verification path succeeds, the drawer updates the form. The user
   must still submit the outer edit form to update Kubernetes resources.

## API Surface

Legacy provider routes under `app/api` handle UI operations such as:

- `getDevboxList`, `getDevboxByName`, `getDevboxPorts`
- `createDevbox`, `updateDevbox`, `updateDevboxWithoutYaml`
- `startDevbox`, `shutdownDevbox`, `restartDevbox`, `delDevbox`
- `releaseDevbox`, `releaseAndDeployDevbox`
- `templateRepository/*`
- `platform/*`
- `monitor/getMonitorData`

Versioned API routes also exist under `app/api/v1` and `app/api/v2alpha`.
OpenAPI documentation is served through `app/api/openapi/route.ts` and
`app/api/v2alpha/openapi/route.ts`.

## Data Model

Template repository data uses Prisma. There is intentionally no default
`prisma/schema.prisma`; see `prisma/README.md`.

Runtime client routing:

- `DATABASE_PROVIDER=cockroachdb` uses `prisma/cockroach/schema.prisma`
- `DATABASE_PROVIDER=postgresql` uses `prisma/postgresql/schema.prisma`

## Deployment Shape

The deployed workload is `deployment/devbox-frontend` in namespace
`devbox-frontend`. It includes:

- init container `devbox-frontend-init` for Prisma migration deployment
- main container `devbox-frontend` for the Next.js app
- service `devbox-frontend`
- ingress `devbox.<cloudDomain>`
- challenge ingress for `/.well-known/devbox-domain-challenge`
