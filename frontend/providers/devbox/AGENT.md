# Devbox Provider Agent Notes

## Scope

This directory is the Devbox provider in the Sealos frontend workspace. It owns
the DevBox list, create/edit flow, detail page, template conversion UI, release
and deployment actions, and provider-side API routes under `app/api`.

## Working Rules

- Keep changes scoped to `frontend/providers/devbox` unless the task clearly
  crosses a shared package boundary.
- Do not execute database writes or migrations unless the user explicitly asks.
- For production or test cloud images, build `linux/amd64` by default.
- For 70-cluster work, use `KUBECONFIG=/Users/mlhiter/.kube/70` and namespace
  `devbox-frontend` unless the user gives a different target.
- The deployed image path uses the monorepo root `frontend/Dockerfile` with
  `--build-arg name=devbox --build-arg path=providers/devbox`.
- The deployment has both `devbox-frontend-init` and `devbox-frontend`
  containers. Inspect both image tags when verifying a rollout.
- Use the Codex in-app Browser for local browser verification.

## Verification

```bash
pnpm ts-lint
git diff --check
```

The package has no `test` script as of 2026-05-19, so generic test autodetection
that runs `npm test` will fail. Do not report that as a product regression; call
out the missing test script separately.

## Important Paths

- `app/[lang]/(platform)/(home)/page.tsx` - DevBox list entry.
- `app/[lang]/(platform)/devbox/create/page.tsx` - create/edit page shell.
- `app/[lang]/(platform)/devbox/create/components/Network.tsx` - network form,
  public domain toggle, and custom domain drawer entry.
- `components/drawers/CustomAccessDrawer.tsx` - custom domain verification UX.
- `app/api/platform/authCname/route.ts` - CNAME verification endpoint.
- `app/api/platform/authDomainChallenge/route.ts` - fallback ownership
  challenge verification endpoint.
- `utils/json2Yaml.ts` - form-to-Kubernetes manifest generation.
- `services/backend/kubernetes.ts` - Kubernetes client setup.
- `services/request.ts` - frontend request wrapper and auth headers.
- `services/db/init.ts` - Prisma client routing by `DATABASE_PROVIDER`.

## Custom Domain Notes

Custom domain verification first checks CNAME via `/api/platform/authCname`.
If that fails, it tries `/api/platform/authDomainChallenge`. A successful drawer
verification only updates the form field; the user still needs to click the
outer `update`/`变更` button to save the network configuration.

For issue `labring-sigs/sealos-issues#171`, the reported "click confirm and
nothing happens" path was caused by dynamic DNS errors such as
`queryCname ENOTFOUND <domain>` being treated as translation keys. Keep dynamic
DNS errors out of `next-intl` lookup paths; map known DNS codes to stable i18n
keys and show unknown messages as plain text.
