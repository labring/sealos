import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(frontend, '../.context/npm-release');
const packages = {
  gtm: '@labring/sealos-gtm-sdk',
  shared: '@labring/sealos-shared-sdk'
};

// Refuse to overwrite an existing candidate (which may already have been verified).
if (existsSync(destination)) throw new Error(`Release directory already exists: ${destination}`);
mkdirSync(destination, { recursive: true });

for (const [directory, name] of Object.entries(packages)) {
  const source = join(frontend, 'packages', directory);
  const target = join(destination, directory);
  mkdirSync(target);
  const manifest = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
  manifest.name = name;
  delete manifest.private;
  manifest.publishConfig = { access: 'public', registry: 'https://registry.npmjs.org/' };
  manifest.repository = {
    type: 'git',
    url: 'git+https://github.com/labring/sealos.git',
    directory: `frontend/packages/${directory}`
  };
  if (directory === 'shared') {
    manifest.files = ['src', 'src-server', 'README.md'];
    for (const field of ['peerDependencies', 'devDependencies']) {
      delete manifest[field]['sealos-desktop-sdk'];
      manifest[field]['@labring/sealos-desktop-sdk'] = '^0.1.24';
    }
    manifest.peerDependenciesMeta['@labring/sealos-desktop-sdk'] =
      manifest.peerDependenciesMeta['sealos-desktop-sdk'];
    delete manifest.peerDependenciesMeta['sealos-desktop-sdk'];
  }
  for (const item of ['src', 'src-server', 'README.md', 'tsconfig.json', 'tests']) {
    if (existsSync(join(source, item)))
      cpSync(join(source, item), join(target, item), { recursive: true });
  }
  function rewriteImports(path) {
    for (const item of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, item.name);
      if (item.isDirectory()) rewriteImports(file);
      else if (/\.(ts|tsx|md)$/.test(item.name)) {
        const text = readFileSync(file, 'utf8')
          .replaceAll('@sealos/gtm', packages.gtm)
          .replaceAll('@sealos/shared', packages.shared)
          .replace(/(['"])sealos-desktop-sdk(?=['"/])/g, '$1@labring/sealos-desktop-sdk');
        writeFileSync(file, text);
      }
    }
  }
  rewriteImports(target);
  writeFileSync(join(target, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`${name}@${manifest.version}: ${target}`);
}
