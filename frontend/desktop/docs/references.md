# References

## Framework And Library Docs

- Next.js: https://nextjs.org/docs
- Chakra UI v2: https://v2.chakra-ui.com/getting-started
- TanStack Query v4: https://tanstack.com/query/v4
- Zustand: https://zustand-demo.pmnd.rs/
- Prisma: https://www.prisma.io/docs
- Kubernetes JavaScript client: https://github.com/kubernetes-client/javascript
- next-i18next: https://github.com/i18next/next-i18next

## In-Repo References

- `package.json`: scripts and runtime dependencies.
- `deploy/README.md`: Helm deployment overview.
- `deploy/HELM_VALUES_GUIDE.md`: Helm override examples.
- `src/styles/chakraTheme.ts`: Chakra theme overrides and semantic tokens.
- `src/services/request.ts`: API request and response handling.
- `src/utils/sessionConfig.ts`: session setup after region token initialization.
- `src/types/session.ts`: persisted session shape.
- `prisma/global/schema.prisma`: global user/profile schema.
- `prisma/region/schema.prisma`: regional workspace/user schema.

## Product References

- Personal workspace display is localized through `common:default_team`.
- Layout, branding, and background configuration are sourced through Helm values
  and platform config API routes before reaching render-time stores.
