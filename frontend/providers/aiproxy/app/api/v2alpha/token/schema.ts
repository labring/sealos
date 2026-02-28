import { z } from 'zod'

/**
 * Request body schema for POST /token
 */
export const createTokenBodySchema = z.object({
  name: z
    .string()
    .min(1, 'Token name is required')
    .max(100, 'Token name must not exceed 100 characters'),
})

export type CreateTokenBody = z.infer<typeof createTokenBodySchema>
