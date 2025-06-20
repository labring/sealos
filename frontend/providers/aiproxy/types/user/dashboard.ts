import { ApiResp } from "../api"

export interface ChartDataItem {
  timestamp: number
  request_count: number
  used_amount: number
  exception_count: number
  max_tpm: number
  max_rpm: number
  max_rps: number
  max_tps: number
}
export interface DashboardData {
  chart_data: ChartDataItem[]
  token_names: string[]
  models: string[]
  total_count: number
  exception_count: number
  used_amount: number
  rpm: number
  tpm: number
  max_tpm: number
  max_rpm: number
  max_rps: number
  max_tps: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
}

export type DashboardResponse = ApiResp<DashboardData>
