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
  price: {
    input_price: number
    output_price: number
    image_input_price: number
    thinking_mode_output_price: number
    per_request_price: number
  }
  token_id: number
  token_name: string
  usage: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
  channel: number
  endpoint: string
  created_at: number
}

export interface GlobalLogItem extends LogItem {}
