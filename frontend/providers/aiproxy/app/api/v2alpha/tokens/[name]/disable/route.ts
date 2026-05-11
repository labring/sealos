import { NextRequest, NextResponse } from 'next/server'

import { ErrorCode, ErrorType, sendError, sendValidationError } from '@/lib/v2alpha/error'
import { setTokenStatus } from '@/lib/v2alpha/tokens'
import { kcOrAppTokenAuthDecoded } from '@/utils/backend/auth'

import { tokenNameParamSchema } from '../schema'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
): Promise<NextResponse> {
  try {
    const group = await kcOrAppTokenAuthDecoded(request.headers)

    const validationResult = tokenNameParamSchema.safeParse(params)
    if (!validationResult.success) {
      return sendValidationError(validationResult.error, 'Invalid token name.')
    }

    const { name } = validationResult.data
    const result = await setTokenStatus(name, group, 2)

    if (result === 'not_found') {
      return sendError({
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: 'The specified token does not exist.',
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Token disable error:', error)

    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.startsWith('Auth:')) {
      return sendError({
        status: 401,
        type: ErrorType.AUTHENTICATION_ERROR,
        code: ErrorCode.AUTHENTICATION_REQUIRED,
        message: 'Unauthorized, please login again.',
        details: errorMessage,
      })
    }

    return sendError({
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to disable token.',
      details: errorMessage,
    })
  }
}
