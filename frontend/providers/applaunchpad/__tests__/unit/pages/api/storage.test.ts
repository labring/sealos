import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

describe('storage PATCH handlers empty-array semantics', () => {
  it('v1 allows an empty storage array to remove all storage', () => {
    const source = readFileSync(
      new URL('../../../../src/pages/api/v1/app/[name]/storage.ts', import.meta.url),
      'utf8'
    );

    expect(source).toContain('if (storage.length === 0) {');
    expect(source).toContain('updatedAppData.storeList = [];');
    expect(source).toContain('deleteCollectionNamespacedPersistentVolumeClaim');
    expect(source).not.toContain('At least one storage configuration is required');
  });

  it('v2alpha allows an empty storage array to remove all storage', () => {
    const source = readFileSync(
      new URL('../../../../src/pages/api/v2alpha/apps/[name]/storage.ts', import.meta.url),
      'utf8'
    );

    expect(source).toContain('if (storage.length === 0) {');
    expect(source).toContain('updatedAppData.storeList = [];');
    expect(source).toContain('deleteCollectionNamespacedPersistentVolumeClaim');
  });

  it('documents empty array as remove-all in both storage schemas', () => {
    for (const file of ['request_schema.ts', 'v2alpha/request_schema.ts']) {
      const source = readFileSync(
        new URL(`../../../../src/types/${file}`, import.meta.url),
        'utf8'
      );
      const start = source.indexOf('export const UpdateStorageSchema');

      expect(start).toBeGreaterThanOrEqual(0);
      expect(source.slice(start)).toContain('Pass an empty array to remove all storage');
    }
  });
});
