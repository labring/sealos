export type TokenInfo = {
  key: string
  name: string
  group: string
  subnet: string
  models: string[] | null
  status: number
  id: number
  quota: number
  used_amount: number
  request_count: number
  created_at: number
  accessed_at: number
  expired_at: number
}
