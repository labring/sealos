export interface LogItem {
  id: number
  code: number
  content: string
  group: string
  model: string
  used_amount: number
  price: number
  completion_price: number
  token_id: number
  token_name: string
  prompt_tokens: number
  completion_tokens: number
  channel: number
  endpoint: string
  created_at: number
}

export interface GlobalLogItem extends LogItem {
  request_id: string
  request_at: number
}
