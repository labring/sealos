import { NextResponse } from 'next/server'

import { ERROR_TEXT, ERROR_RESPONSE } from '../error'

export const jsonRes = <T = any>(props: {
  code?: number
  message?: string
  data?: T
  error?: any
}) => {
  const { code = 200, message = '', data = null, error } = props || {}

  if (typeof error === 'string' && ERROR_RESPONSE[error]) {
    return NextResponse.json(ERROR_RESPONSE[error])
  }

  let msg = message
  if ((code < 200 || code >= 400) && !message) {
    msg = error?.body?.message || error?.message || 'request error'
    if (typeof error === 'string') {
      msg = error
    } else if (error?.code && error.code in ERROR_TEXT) {
      msg = ERROR_TEXT[error.code]
    }
    console.log('===jsonRes===\n', error)
  }

  return NextResponse.json({
    code,
    statusText: '',
    message: msg,
    data: data || error || null
  })
}
