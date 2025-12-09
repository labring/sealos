import { z } from 'zod'

/**
 * Token search query parameters schema
 */
export const tokenSearchQuerySchema = z.object({
  name: z.string().optional(),
})

export type TokenSearchQuery = z.infer<typeof tokenSearchQuerySchema>

