import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(__dirname, '../../../../../src/components/app/detail/index/PodFileModal.tsx'),
  'utf8'
);

describe('PodFileModal file listing errors', () => {
  it('rechecks write access for each pod and prevents writes when it is denied', () => {
    expect(source).toContain('isError');
    expect(source).toContain("getErrText(error, 'Failed to load files')");
    expect(source).toContain('onClick={() => refetch()}');
    expect(source).toContain("['PodExecPermission', podDetail.podName]");
    expect(source).toContain('checkPodExecPermission(podDetail.podName)');
    expect(source).toContain("refetchOnMount: 'always'");
    expect(source).toContain('isDisabled={isWriteDisabled}');
    expect(source).toContain('isDisabled={isWriteDisabled} onClick={handleConfirm}');
  });
});
