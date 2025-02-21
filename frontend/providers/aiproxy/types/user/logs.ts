export interface RequestDetail {
  request_body?: string
  response_body?: string
  id: number
  log_id: number
}

export interface LogItem {
  request_detail?: RequestDetail
  request_id: string
  request_at: number
  id: number
  code: number
  content: string
  group: string
  model: string
  mode: number
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

export interface GlobalLogItem extends LogItem {}
