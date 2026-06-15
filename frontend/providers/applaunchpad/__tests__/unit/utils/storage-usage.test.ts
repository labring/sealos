import { describe, expect, it } from 'vitest';
import { Quantity } from '@sealos/shared';
import {
  calculateStorageUsagePercent,
  calculateStorageUsagePercentFromUsageData
} from '@/utils/storage-usage';

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

  it('calculates app storage usage from per-PVC usage percentages', () => {
    const usageData = [
      { name: 'data-demo-0', xData: [100, 200], yData: ['10', '25'] },
      { name: 'cache-demo-0', xData: [100, 200], yData: ['20', '50'] }
    ];
    const storeList = [
      { name: 'data', value: { formatForDisplay: () => '100' } },
      { name: 'cache', value: { formatForDisplay: () => '300' } }
    ];

    expect(calculateStorageUsagePercentFromUsageData(usageData, storeList)).toBe(43.8);
  });

  it('falls back to equal weighting when configured capacities are unavailable', () => {
    const usageData = [
      { name: 'data-demo-0', xData: [100], yData: ['10'] },
      { name: 'cache-demo-0', xData: [100], yData: ['50'] }
    ];

    expect(calculateStorageUsagePercentFromUsageData(usageData)).toBe(30);
  });

  it('uses real Quantity values for configured storage capacities', () => {
    const usageData = [
      { name: 'data-demo-0', xData: [100], yData: ['20'] },
      { name: 'cache-demo-0', xData: [100], yData: ['60'] }
    ];
    const storeList = [
      { name: 'data', value: Quantity.mustParse('1Gi') },
      { name: 'cache', value: Quantity.mustParse('3Gi') }
    ];

    expect(calculateStorageUsagePercentFromUsageData(usageData, storeList)).toBe(50);
  });

  it('counts each configured store capacity once across replica PVCs', () => {
    const usageData = [
      { name: 'vn-homevn-fulling-test-jopywbsx-0', xData: [100], yData: ['51.97'] },
      { name: 'vn-homevn-fulling-test-jopywbsx-1', xData: [100], yData: ['0.02'] },
      { name: 'vn-homevn-fulling-test-jopywbsx-2', xData: [100], yData: ['0.02'] },
      { name: 'vn-homevn-data1-test-jopywbsx-0', xData: [100], yData: ['6.60'] },
      { name: 'vn-homevn-data1-test-jopywbsx-1', xData: [100], yData: ['0.03'] },
      { name: 'vn-homevn-data2-test-jopywbsx-0', xData: [100], yData: ['1.06'] },
      { name: 'vn-homevn-data3-test-jopywbsx-0', xData: [100], yData: ['0.03'] },
      { name: 'vn-homevn-data-test-jopywbsx-0', xData: [100], yData: ['0.03'] }
    ];
    const storeList = [
      { name: 'vn-homevn-fulling', value: Quantity.mustParse('10Gi') },
      { name: 'vn-homevn-data1', value: Quantity.mustParse('1Gi') },
      { name: 'vn-homevn-data2', value: Quantity.mustParse('1Gi') },
      { name: 'vn-homevn-data3', value: Quantity.mustParse('1Gi') },
      { name: 'vn-homevn-data', value: Quantity.mustParse('1Gi') }
    ];

    expect(calculateStorageUsagePercentFromUsageData(usageData, storeList)).toBe(37.7);
  });
});
