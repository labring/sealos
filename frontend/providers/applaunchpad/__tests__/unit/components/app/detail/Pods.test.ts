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
  it('checks the target pod before opening or switching file management', () => {
    const body = getFunctionBody('handleOpenFileManagement');

    expect(body).toContain('await checkPodExecPermission(podName)');
    expect(body).toContain('setDetailFilePodIndex(index)');
    expect(body).toContain('onOpenPodFile()');
    expect(source).toContain('handleOpenFileManagement(item.podName, i)');
    expect(source).toContain('setPodDetail={(podName: string) =>');
    expect(source).toContain('handleOpenFileManagement(\n              podName,');
  });

  it('uses the current terminal execution route', () => {
    expect(source).toContain("pathname: '/exec'");
    expect(source).toContain('pod: item.podName');
    expect(source).toContain('container');
  });
});
