import { jsonRes } from '@/services/backend/response'
import { devboxDB } from '@/services/db/init'
import { NextRequest } from 'next/server'
import { z } from 'zod'
export const dynamic = 'force-dynamic'
const schema = z.object({
  isPublic: z.boolean().default(false),
  tags: z.string().array().default([]),
})
type schemaError = z.ZodError<typeof schema>
export async function GET(req: NextRequest) {
  try {
    const tagList = await devboxDB.tag.findMany({
      where: {
      },
    })

    return jsonRes({
      data: {
        tagList
      }
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}