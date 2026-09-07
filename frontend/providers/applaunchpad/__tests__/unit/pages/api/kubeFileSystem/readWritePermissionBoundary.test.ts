import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const routeDir = resolve(__dirname, '../../../../../src/pages/api/kubeFileSystem');

const readRouteFiles = ['ls.ts', 'download.ts'];
const writeRouteFiles = ['mkdir.ts', 'mv.ts', 'rm.ts', 'touch.ts', 'upload.ts'];

function readRoute(filename: string) {
  return readFileSync(resolve(routeDir, filename), 'utf8');
}

describe('kube file system permission boundary', () => {
  it.each(readRouteFiles)('does not preflight exec permission for read route %s', (filename) => {
    expect(readRoute(filename)).not.toContain('assertPodExecPermission');
  });

  it.each(writeRouteFiles)('keeps exec permission preflight for write route %s', (filename) => {
    expect(readRoute(filename)).toContain('assertPodExecPermission');
  });
});
