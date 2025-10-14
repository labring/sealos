import { NextResponse } from 'next/server'

import { getApiDocs } from '@/lib/swagger'

/**
 * @swagger
 * /api/swagger:
 *   get:
 *     tags:
 *       - Swagger
 *     summary: Get Swagger JSON specification
 *     description: Returns the OpenAPI/Swagger specification in JSON format
 *     responses:
 *       200:
 *         description: Swagger specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  const spec = await getApiDocs()

  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
