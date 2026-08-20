import { describe, expect, it } from 'vitest';
import { Quantity } from '@sealos/shared';
import {
  cpuMillicoresToQuantity,
  parseK8sQuantityOrZero,
  publicCpuCoresToQuantity,
  publicMemoryGiToQuantity,
  quantityToCpuMillicores,
  quantityToMemoryMi,
  quantityToPublicCpuCores,
  quantityToPublicMemoryGi,
  quantityToStorageGi,
  storageGiToQuantity,
  memoryMiToQuantity,
  storageAnnotationToQuantity
} from '@/utils/resourceQuantity';

describe('resourceQuantity helpers', () => {
  it('converts public CPU cores to Quantity and back', () => {
    const quantity = publicCpuCoresToQuantity(0.5);

    expect(quantity.toString()).toBe('500m');
    expect(quantityToPublicCpuCores(quantity)).toBe(0.5);
  });

  it('converts CPU millicores to Quantity and back', () => {
    const quantity = cpuMillicoresToQuantity(200);

    expect(quantity.toString()).toBe('200m');
    expect(quantityToCpuMillicores(quantity)).toBe(200);
  });

  it('converts public memory Gi values to BinarySI Quantity and back', () => {
    const quantity = publicMemoryGiToQuantity(1);

    expect(quantity.toString()).toBe('1Gi');
    expect(quantityToPublicMemoryGi(quantity)).toBe(1);
  });

  it('converts memory Mi values to Quantity and back', () => {
    const quantity = memoryMiToQuantity(256);

    expect(quantity.toString()).toBe('256Mi');
    expect(quantityToMemoryMi(quantity)).toBe(256);
  });

  it('converts fractional public memory values through Mi precision', () => {
    const quantity = publicMemoryGiToQuantity(0.5);

    expect(quantity.toString()).toBe('512Mi');
    expect(quantityToPublicMemoryGi(quantity)).toBe(0.5);
  });

  it('returns zero for empty, missing, or invalid Kubernetes quantities', () => {
    expect(parseK8sQuantityOrZero(undefined).equals(Quantity.ZERO)).toBe(true);
    expect(parseK8sQuantityOrZero('').equals(Quantity.ZERO)).toBe(true);
    expect(parseK8sQuantityOrZero('invalid').equals(Quantity.ZERO)).toBe(true);
  });

  it('converts storage Gi values to Quantity and back', () => {
    const quantity = storageGiToQuantity(2);

    expect(quantity.toString()).toBe('2Gi');
    expect(quantityToStorageGi(quantity)).toBe(2);
  });

  it('parses legacy and Quantity PVC storage annotations', () => {
    expect(storageAnnotationToQuantity('2').toString()).toBe('2Gi');
    expect(storageAnnotationToQuantity('2Gi').toString()).toBe('2Gi');
    expect(
      storageAnnotationToQuantity('1536Mi').formatForDisplay({
        format: 'BinarySI',
        scale: 'auto',
        digits: 4
      })
    ).toBe('1.5Gi');
    expect(storageAnnotationToQuantity(undefined).equals(Quantity.ZERO)).toBe(true);
  });
});
