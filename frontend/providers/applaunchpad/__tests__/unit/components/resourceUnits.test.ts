import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('application resource unit labels', () => {
  it('uses GiB throughout the resource quota and storage editing surfaces', () => {
    const quotaBox = readSource('../../../src/pages/app/edit/components/QuotaBox.tsx');

    expect(quotaBox).toContain("unit: 'GiB'");
    expect(quotaBox).not.toContain("unit: 'Gi'");
  });
});
