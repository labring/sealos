# Publishing GTM and Shared

The workspace uses internal package names and workspace dependencies. Prepare
separate npm candidates so internal consumers continue to use the workspace.

From the repository root:

```sh
node frontend/scripts/prepare-npm-packages.mjs
```

This creates `.context/npm-release/gtm` and `.context/npm-release/shared` and
refuses to overwrite existing candidates. Keep verified candidates until the
release is complete. Use a fresh workspace for a new release candidate.

The generated manifests use `@labring` names, public npm registry configuration,
and repository metadata. Shared's Desktop SDK imports, peer metadata, and
version range are rewritten together to `@labring/sealos-desktop-sdk@^0.1.24`.
Internal workspace manifests retain their local names and dependency links.

Build, test, and pack GTM:

```sh
cd .context/npm-release/gtm
npm install --ignore-scripts
npm test
npm run build
npm pack
```

Shared is distributed as TypeScript source. Pack it from its generated directory:

```sh
cd .context/npm-release/shared
npm pack
```

Inspect both archives and install them into a fresh consumer before publishing.
Check that Shared has no `workspace:` dependency ranges or internal Desktop SDK
imports. Check GTM's default GTM-only behavior, bounded Rybbit replay, and disabling.

Publish the verified tarballs from their respective directories:

```sh
npm whoami --registry=https://registry.npmjs.org/
npm publish ./labring-sealos-gtm-sdk-1.1.0.tgz --access public --registry=https://registry.npmjs.org/
# From the shared directory:
npm publish ./labring-sealos-shared-sdk-1.0.3.tgz --access public --registry=https://registry.npmjs.org/
```

After publishing, query the registry versions and dist-tags, download both remote
archives, and compare their checksums to the locally verified tarballs.
