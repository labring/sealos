export type ApiResp<T = any> = {
  code: number
  message?: string
  error?: string
  data?: T
}

export type ApiProxyBackendResp<T = any> = {
  success: boolean
  message: string
  data?: T
}

export const isApiResp = (x: unknown): x is ApiResp => {
  return (
    typeof x === 'object' &&
    x !== null &&
    'code' in x &&
    'message' in x &&
    typeof (x as any).code === 'number' &&
    typeof (x as any).message === 'string'
  )
}
