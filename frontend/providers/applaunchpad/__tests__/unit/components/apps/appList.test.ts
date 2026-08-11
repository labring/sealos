import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

describe('AppList name hover layout', () => {
  it('keeps the hover area and remarked app name width stable', () => {
    const source = readFileSync(
      new URL('../../../../src/components/apps/appList.tsx', import.meta.url),
      'utf8'
    );

    expect(source).toContain('width="100%"');
    expect(source).toContain('minWidth={0}');
    expect(source).toContain("'& .remark-button-sibling': {");
    expect(source).toContain(
      "className={item.remark ? undefined : 'remark-button-sibling'}"
    );
    expect(source).not.toContain("'& .app-name': {");
  });
});
