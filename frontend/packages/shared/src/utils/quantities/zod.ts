import { z } from 'zod';

import { Quantity } from './quantity';
import type { QuantityJSON } from './types';

/**
 * Accepts `string | number` (OpenAPI v3 oneOf compatible) and transforms it into an immutable `Quantity`.
 *
 * Note: JSON numbers in JS may already lose precision. Prefer using strings in business code.
 */
export const QuantitySchema = z.union([z.string(), z.number()]).transform((v, ctx) => {
  try {
    return Quantity.fromJSON(v satisfies QuantityJSON);
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: e instanceof Error ? e.message : 'Invalid quantity'
    });
    return z.NEVER;
  }
});

/** Input type accepted by `QuantitySchema` (string | number). */
export type QuantitySchemaInput = z.input<typeof QuantitySchema>;
/** Output type of `QuantitySchema` (Quantity). */
export type QuantitySchemaOutput = z.output<typeof QuantitySchema>;
