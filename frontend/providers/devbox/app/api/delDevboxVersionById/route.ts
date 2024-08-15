import { NextRequest } from 'next/server'

import { jsonRes } from '@/services/backend/response'

export async function DELETE(req: NextRequest) {
  try {
    return jsonRes({
      data: 'success delete devboxVersion'
    })
  } catch (err: any) {
    jsonRes({
      code: 500,
      error: err
    })
  }
}
