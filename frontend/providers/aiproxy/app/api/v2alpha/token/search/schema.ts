import { z } from 'zod'

/**
 * Token search query parameters schema
 */
export const tokenSearchQuerySchema = z.object({
  name: z.string().optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1, 'perPage must be at least 1')
    .max(100, 'perPage must not exceed 100')
    .default(10),
})

export type TokenSearchQuery = z.infer<typeof tokenSearchQuerySchema>
