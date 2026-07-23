import { z } from 'zod'

/**
 * Token name path parameter schema
 */
export const tokenNameParamSchema = z.object({
  name: z
    .string()
    .min(1, 'Token name is required')
    .max(100, 'Token name must not exceed 100 characters'),
})

export type TokenNameParam = z.infer<typeof tokenNameParamSchema>
