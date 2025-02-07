export interface GroupInfo {
  id: string
  status: number
  used_amount: number
  qpm: number
  request_count: number
  created_at: number
  accessed_at: number
}

export interface GroupQueryParams {
  keyword?: string
  page: number
  perPage: number
}

export enum GroupStatus {
  ENABLED = 1,
  DISABLED = 2
}
