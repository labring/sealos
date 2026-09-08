import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(__dirname, '../../../../../src/components/app/detail/index/Pods.tsx'),
  'utf8'
);

function getFunctionBody(functionName: string) {
  const start = source.indexOf(`const ${functionName}`);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextConst = source.indexOf('\n  const ', start + 1);
  expect(nextConst).toBeGreaterThan(start);

  return source.slice(start, nextConst);
}

describe('Pods file management action', () => {
  it('opens file management for the selected pod without requiring write access', () => {
    const body = getFunctionBody('handleOpenFileManagement');

    expect(body).toContain('setDetailFilePodIndex(index)');
    expect(body).toContain('onOpenPodFile()');
    expect(body).not.toContain('checkPodExecPermission');
    expect(source).toContain('handleOpenFileManagement(i)');
    expect(source).toContain('setPodDetail={(podName: string) =>');
    expect(source).toContain(
      'handleOpenFileManagement(pods.findIndex((item) => item.podName === podName))'
    );
  });

  it('uses the current terminal execution route', () => {
    expect(source).toContain("pathname: '/exec'");
    expect(source).toContain('pod: item.podName');
    expect(source).toContain('container');
  });
});
