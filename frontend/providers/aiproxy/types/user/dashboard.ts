import { ApiResp } from '../api'

export interface ChartDataItem {
  timestamp: number
  request_count: number
  used_amount: number
  exception_count: number
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
}

export type DashboardResponse = ApiResp<DashboardData>
