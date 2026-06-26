# Architecture Notes

## Managed Public Domain Prefixes

Launchpad stores the generated public-domain prefix in `network.publicDomain` and the managed
domain suffix in `network.domain`. The public host is built as:

```text
<publicDomain>.<domain>
```

`publicDomain` must remain a single DNS label. The shared schema in
`src/types/schema.ts` and `src/types/v2alpha/schema.ts` enforces the DNS label limit:

- maximum length: 63 characters
- allowed characters: lowercase letters, numbers, and hyphens
- first and last character: lowercase letter or number
- empty string is allowed only for non-public or not-yet-generated prefixes

The v1 and v2alpha request schemas both reuse this rule so UI, YAML/API, and update paths do not
drift. When callers pass a valid `publicDomain`, create/update flows preserve it; otherwise the
system keeps the existing prefix or generates a 12-character default.
