import { z } from 'zod'

/**
 * Request body schema for POST /tokens
 */
export const createTokenBodySchema = z.object({
  name: z
    .string()
    .min(1, 'Token name is required')
    .max(100, 'Token name must not exceed 100 characters'),
})

export type CreateTokenBody = z.infer<typeof createTokenBodySchema>

/**
 * Query parameters schema for GET /tokens
 */
export const listTokensQuerySchema = z.object({
  name: z.string().optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1, 'perPage must be at least 1')
    .max(100, 'perPage must not exceed 100')
    .default(10),
})

export type ListTokensQuery = z.infer<typeof listTokensQuerySchema>
