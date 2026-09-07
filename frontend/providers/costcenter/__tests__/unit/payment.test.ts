import { describe, expect, it } from 'vitest';
import { valuationMap } from '../../src/constants/payment';

describe('resource valuation units', () => {
  it('prices network resources in GiB while preserving binary scaling', () => {
    expect(valuationMap.get('network')).toMatchObject({
      unit: 'GiB',
      scale: 1024
    });
  });
});
