/**
 * The suffix category of a quantity string.
 *
 * Kubernetes remembers the format category from parsing, and will prefer the
 * same category when serializing (after canonicalization).
 */
export type Format = 'DecimalExponent' | 'BinarySI' | 'DecimalSI';

export type DecimalFormat = Exclude<Format, 'BinarySI'>;

export type BinaryScaleExponent = 10 | 20 | 30 | 40 | 50 | 60;

declare const binaryScaleBrand: unique symbol;

/** Base-1024 scale used by BinarySI quantities (Kibi=2^10, Mebi=2^20, Gibi=2^30, ...). */
export type BinaryScale = number & { readonly [binaryScaleBrand]: unique symbol };

/** Common base-1024 scales used by BinarySI quantities. */
export const BinaryScale = {
  Kibi: 10 as BinaryScale,
  Mebi: 20 as BinaryScale,
  Gibi: 30 as BinaryScale,
  Tebi: 40 as BinaryScale,
  Pebi: 50 as BinaryScale,
  Exbi: 60 as BinaryScale
} as const;

/** From Kubernetes: 10^scale */
export type Scale = number & { readonly __brand: unique symbol };

/**
 * Common base-10 scales used by Kubernetes quantities.
 *
 * Note: micro uses `u` (not `µ`) in k8s.
 */
export const Scale = {
  Nano: -9 as Scale,
  Micro: -6 as Scale,
  Milli: -3 as Scale,
  None: 0 as Scale,
  Kilo: 3 as Scale,
  Mega: 6 as Scale,
  Giga: 9 as Scale,
  Tera: 12 as Scale,
  Peta: 15 as Scale,
  Exa: 18 as Scale
} as const;

/** JSON shape aligned with OpenAPI v3 `oneOf: ["string", "number"]`. */
export type QuantityJSON = string | number;
