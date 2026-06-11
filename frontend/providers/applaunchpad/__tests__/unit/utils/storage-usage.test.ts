import { describe, expect, it } from 'vitest';
import { calculateStorageUsagePercent } from '@/utils/storage-usage';

describe('storage usage helpers', () => {
  it('calculates storage usage from total used bytes over total size bytes', () => {
    const sizeData = [
      { name: 'pvc-a', xData: [100, 200], yData: ['100', '100'] },
      { name: 'pvc-b', xData: [100, 200], yData: ['900', '900'] }
    ];
    const availData = [
      { name: 'pvc-a', xData: [100, 200], yData: ['0', '0'] },
      { name: 'pvc-b', xData: [100, 200], yData: ['810', '810'] }
    ];

    expect(calculateStorageUsagePercent(sizeData, availData)).toBe(19);
  });

  it('returns zero when size data has no usable positive values', () => {
    expect(
      calculateStorageUsagePercent(
        [{ name: 'pvc-a', xData: [100], yData: ['0'] }],
        [{ name: 'pvc-a', xData: [100], yData: ['0'] }]
      )
    ).toBe(0);
  });

  it('keeps tiny non-zero usage visible', () => {
    expect(
      calculateStorageUsagePercent(
        [{ name: 'pvc-a', xData: [100], yData: ['1000'] }],
        [{ name: 'pvc-a', xData: [100], yData: ['999.5'] }]
      )
    ).toBe(0.1);
  });
});
