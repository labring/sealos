export interface ApiResp<T = any> {
  code: number
  message: string
  data?: T
}

export const isApiResp = (x: unknown): x is ApiResp =>
  typeof x.code === 'number' && typeof x.message === 'string'
