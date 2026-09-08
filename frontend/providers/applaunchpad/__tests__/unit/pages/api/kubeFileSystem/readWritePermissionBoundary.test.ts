import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const routeDir = resolve(__dirname, '../../../../../src/pages/api/kubeFileSystem');

const routeFiles = {
  'ls.ts': resolve(routeDir, 'ls.ts'),
  'download.ts': resolve(routeDir, 'download.ts'),
  'mkdir.ts': resolve(routeDir, 'mkdir.ts'),
  'mv.ts': resolve(routeDir, 'mv.ts'),
  'rm.ts': resolve(routeDir, 'rm.ts'),
  'touch.ts': resolve(routeDir, 'touch.ts'),
  'upload.ts': resolve(routeDir, 'upload.ts')
} as const;

const readRouteFiles = ['ls.ts', 'download.ts'] as const;
const writeRouteFiles = ['mkdir.ts', 'mv.ts', 'rm.ts', 'touch.ts', 'upload.ts'] as const;

function readRoute(filename: keyof typeof routeFiles) {
  return readFileSync(routeFiles[filename], 'utf8');
}

describe('kube file system permission boundary', () => {
  it.each(readRouteFiles)('does not preflight exec permission for read route %s', (filename) => {
    expect(readRoute(filename)).not.toContain('assertPodExecPermission');
  });

  it.each(writeRouteFiles)('keeps exec permission preflight for write route %s', (filename) => {
    expect(readRoute(filename)).toContain('assertPodExecPermission');
  });
});
