import { z } from 'zod';

import { Quantity } from './quantity';
import type { QuantityJSON } from './types';

/**
 * Accepts `string | number` JSON values and already-hydrated `Quantity` instances.
 *
 * Note: JSON numbers in JS may already lose precision. Prefer using strings in business code.
 */
const HydratedQuantitySchema = z.custom<Quantity>((v) => v instanceof Quantity);

export const QuantitySchema = z
  .union([HydratedQuantitySchema, z.string(), z.number()])
  .transform((v, ctx) => {
    if (v instanceof Quantity) return v;

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

/** Input type accepted by `QuantitySchema` (Quantity | string | number). */
export type QuantitySchemaInput = z.input<typeof QuantitySchema>;
/** Output type of `QuantitySchema` (Quantity). */
export type QuantitySchemaOutput = z.output<typeof QuantitySchema>;
