# AGENTS.md

## Project

Applaunchpad is the Sealos application launchpad provider. It is a Next.js app for creating,
updating, observing, and deleting Kubernetes workloads, with API surfaces under `src/pages/api`,
UI routes under `src/pages`, and Kubernetes object conversion in `src/utils/deployYaml2Json.ts`.

## Local Commands

Run commands from the frontend monorepo root (`../..` from this provider directory) unless a
command explicitly targets this provider directory:

```bash
pnpm --filter ./providers/applaunchpad exec tsc --noEmit --pretty false
pnpm --filter ./providers/applaunchpad lint
```

For focused TypeScript checks from the provider directory, use:

```bash
pnpm dlx tsx@latest --tsconfig=tsconfig.json -e "<script>"
```

## Public Domain Rules

- `network.publicDomain` is the generated public-domain prefix.
- `network.domain` is the managed suffix.
- The full generated host is `<publicDomain>.<domain>`.
- `publicDomain` must remain one DNS label: max 63 characters, lowercase alphanumeric or hyphen,
  and no leading/trailing hyphen.
- Keep this rule shared across `src/types/schema.ts`, `src/types/request_schema.ts`,
  `src/types/v2alpha/schema.ts`, and `src/types/v2alpha/request_schema.ts`.
- When API create/update paths accept `publicDomain`, ensure the value is both validated and
  consumed by the v1 and v2alpha mutation logic.

## Safety Notes

- Do not run database write operations from this provider unless the user explicitly asks.
- Avoid broad frontend refactors when fixing networking or API behavior.
- Treat `.workflow/` markdown as historical planning evidence, not source-of-truth docs.
