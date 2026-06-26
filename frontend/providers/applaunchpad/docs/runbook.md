# Runbook

## Public Domain Prefix Validation

Use these checks after changing managed public-domain prefix behavior:

```bash
pnpm --filter ./providers/applaunchpad exec tsc --noEmit --pretty false
pnpm --filter ./providers/applaunchpad lint
git diff --check
```

For a focused schema check:

```bash
pnpm dlx tsx@latest --tsconfig=tsconfig.json -e "import { publicDomainPrefixSchema, PUBLIC_DOMAIN_PREFIX_MAX_LENGTH } from './src/types/schema'; const ok = 'a'.repeat(PUBLIC_DOMAIN_PREFIX_MAX_LENGTH); const tooLong = 'a'.repeat(PUBLIC_DOMAIN_PREFIX_MAX_LENGTH + 1); if (!publicDomainPrefixSchema.safeParse(ok).success || publicDomainPrefixSchema.safeParse(tooLong).success) throw new Error('publicDomain prefix validation check failed'); console.log('publicDomain prefix validation ok');"
```

Expected behavior:

- 63-character prefixes pass validation.
- 64-character prefixes fail validation.
- uppercase characters and leading/trailing hyphens fail validation.
- updating `publicDomain` is only valid for public HTTP/GRPC/WS ports.
