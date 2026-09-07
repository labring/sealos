import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(__dirname, '../../../../../src/components/app/detail/index/PodFileModal.tsx'),
  'utf8'
);

describe('PodFileModal file listing errors', () => {
  it('renders a visible error state and prevents writes until the listing can be retried', () => {
    expect(source).toContain('isError');
    expect(source).toContain("getErrText(error, 'Failed to load files')");
    expect(source).toContain('onClick={() => refetch()}');
    expect(source).toContain('isDisabled={isError}');
  });
});
