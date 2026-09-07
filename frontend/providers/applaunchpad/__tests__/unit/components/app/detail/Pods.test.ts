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
  it('opens file management without running the terminal exec permission check', () => {
    const body = getFunctionBody('handleOpenFileManagement');

    expect(body).toContain('setDetailFilePodIndex(index)');
    expect(body).toContain('onOpenPodFile()');
    expect(body).not.toContain('checkPodExecPermission');
  });

  it('keeps the terminal action guarded by the exec permission check', () => {
    const body = getFunctionBody('handleOpenTerminal');

    expect(body).toContain('checkPodExecPermission(podName)');
  });
});
