import { BinaryScale, Quantity } from '@sealos/shared';

const roundTo = (value: number, digits = 4): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const quantityToBinaryNumber = (quantity: Quantity, scale: BinaryScale, digits = 4): number =>
  Number.parseFloat(
    quantity.formatForDisplay({
      format: 'BinarySI',
      scale,
      digits
    })
  );

export const parseK8sQuantityOrZero = (value?: string | null): Quantity => {
  if (!value || value === '0') return Quantity.ZERO;

  try {
    return Quantity.parse(value);
  } catch {
    return Quantity.ZERO;
  }
};

export const quantityFromJSONOrZero = (value: unknown): Quantity => {
  if (value === undefined || value === null || value === '') return Quantity.ZERO;

  try {
    return Quantity.fromJSON(value);
  } catch {
    return Quantity.ZERO;
  }
};

export const quantityOrZero = (value: unknown): Quantity =>
  value instanceof Quantity ? value : quantityFromJSONOrZero(value);

export const cpuMillicoresToQuantity = (value: number): Quantity =>
  Quantity.newMilliQuantity(BigInt(Math.round(value)), 'DecimalSI');

export const quantityToCpuMillicores = (quantity: unknown): number =>
  Number(quantityOrZero(quantity).milliValue());

export const publicCpuCoresToQuantity = (value: number): Quantity =>
  cpuMillicoresToQuantity(value * 1000);

export const quantityToPublicCpuCores = (quantity: unknown): number =>
  roundTo(quantityToCpuMillicores(quantity) / 1000);

export const memoryMiToQuantity = (value: number): Quantity =>
  Number.isInteger(value)
    ? Quantity.newBinaryScaledQuantity(BigInt(value), BinaryScale.Mebi)
    : Quantity.newBinaryScaledQuantity(BigInt(Math.ceil(value * 1024)), BinaryScale.Kibi);

export const quantityToMemoryMi = (quantity: unknown): number =>
  quantityToBinaryNumber(quantityOrZero(quantity), BinaryScale.Mebi, 4);

export const publicMemoryGiToQuantity = (value: number): Quantity =>
  memoryMiToQuantity(value * 1024);

export const quantityToPublicMemoryGi = (quantity: unknown): number =>
  roundTo(quantityToMemoryMi(quantity) / 1024);

export const storageGiToQuantity = (value: number): Quantity =>
  Number.isInteger(value)
    ? Quantity.newBinaryScaledQuantity(BigInt(value), BinaryScale.Gibi)
    : memoryMiToQuantity(value * 1024);

export const quantityToStorageGi = (quantity: unknown): number =>
  roundTo(quantityToMemoryMi(quantity) / 1024);

export const storageAnnotationToQuantity = (value?: string | null): Quantity => {
  const annotationValue = value?.trim();
  if (!annotationValue) return Quantity.ZERO;

  return /^\d+(?:\.\d+)?$/.test(annotationValue)
    ? storageGiToQuantity(Number(annotationValue))
    : parseK8sQuantityOrZero(annotationValue);
};

export const cpuRequestQuantity = (limit: unknown): Quantity =>
  cpuMillicoresToQuantity(Math.floor(quantityToCpuMillicores(limit) * 0.1));

export const memoryRequestQuantity = (limit: unknown): Quantity =>
  memoryMiToQuantity(Math.floor(quantityToMemoryMi(limit) * 0.1));
