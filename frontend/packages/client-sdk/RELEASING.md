# SDK release preparation

The source is `frontend/packages/client-sdk` in `labring/sealos`.
[PR #7276](https://github.com/labring/sealos/pull/7276) explicitly records the
0.1.23 version bump for `@labring/sealos-desktop-sdk` and its scoped package dry-run.
The npm 0.1.23 `dist/app.esm.js` also matches this checkout's build byte for byte.
The workspace manifest uses `sealos-desktop-sdk` for internal workspace links;
the public release uses `@labring/sealos-desktop-sdk`. No separate repository is
needed. No automated SDK publish workflow was found in this checkout.

The candidate is **@labring/sealos-desktop-sdk@0.1.24**. It adds the shared
`HostConfig` type with optional `currencySymbol` and `features.analytics`.
AppSDK and MasterOptions use the same definition. Runtime protocol names and SDK
request behavior are unchanged. Do not manually edit generated declarations.

Build with the workspace's pnpm 8.9.0 and Node 20.20.2:

```sh
cd frontend
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter sealos-desktop-sdk exec tsc --noEmit
pnpm --filter sealos-desktop-sdk build
cd ..
mkdir -p .context/sdk-release
cp -R frontend/packages/client-sdk/dist .context/sdk-release/
cp frontend/packages/client-sdk/{package.json,README.md,README_zh.md,RELEASING.md} .context/sdk-release/
node -e 'const fs = require("fs"); const p = ".context/sdk-release/package.json"; const pkg = JSON.parse(fs.readFileSync(p, "utf8")); pkg.name = "@labring/sealos-desktop-sdk"; fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");'
cd .context/sdk-release
npm pack --dry-run
npm pack
```

Only the staging manifest is renamed, preserving the monorepo's internal links.
Package contents are `dist/`, both READMEs, this release guide and package metadata.
Before publishing, obtain user confirmation of the exact name, version and
contents. The npm authentication check on 2026-10-15 returned E401; an authorized
maintainer must authenticate. Only after confirmation:

```sh
npm publish ./labring-sealos-desktop-sdk-0.1.24.tgz --access public
```

Template can install the local candidate before publication:

```sh
pnpm add @labring/sealos-desktop-sdk@file:/absolute/path/labring-sealos-desktop-sdk-0.1.24.tgz
```

After publication, upgrade with:

```sh
pnpm add @labring/sealos-desktop-sdk@0.1.24
```

Existing imports from `@labring/sealos-desktop-sdk/app` stay unchanged.
Version 0.1.24 is a local candidate until npm publication is confirmed.
