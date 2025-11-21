import { z } from 'zod'

/**
 * Token name parameter schema
 */
export const tokenNameParamSchema = z.object({
  name: z.string().min(1, 'Token name is required'),
})

export type TokenNameParam = z.infer<typeof tokenNameParamSchema>

