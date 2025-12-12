/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from 'assert';

// Helper to convert memory from units Ki, Mi, Gi, Ti, Pi to bytes and vise versa

const baseMagnitude = 1024;
const maxMagnitude = ['PiB', baseMagnitude ** 5] as const;
const magnitudes = new Map([
  ['B', 1] as const,
  ['KiB', baseMagnitude ** 1] as const,
  ['MiB', baseMagnitude ** 2] as const,
  ['GiB', baseMagnitude ** 3] as const,
  ['TiB', baseMagnitude ** 4] as const,
  maxMagnitude
]);
const unitRegex = /(?<value>[0-9]+(\.[0-9]*)?)(?<suffix>(B|[KMGTP]iB?))?/;

type BinaryUnit = typeof magnitudes extends Map<infer Key, any> ? Key : never;

export function unitsToBytes(value: string): number {
  const unitsMatch = value.match(unitRegex);

  if (!unitsMatch?.groups) {
    return NaN;
  }

  const parsedValue = parseFloat(unitsMatch.groups.value);

  if (!unitsMatch.groups?.suffix) {
    return parsedValue;
  }

  const magnitude =
    magnitudes.get(unitsMatch.groups.suffix as BinaryUnit) ??
    magnitudes.get(`${unitsMatch.groups.suffix}B` as BinaryUnit);

  assert(magnitude, 'UnitRegex is wrong some how');

  return parseInt((parsedValue * magnitude).toFixed(1));
}
