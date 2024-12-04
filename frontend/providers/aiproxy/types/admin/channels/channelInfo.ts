export interface ChannelInfo {
  model_mapping: Record<string, any>
  config: Record<string, any>
  other: string
  key: string
  name: string
  base_url: string
  models: any[]
  balance: number
  response_duration: number
  id: number
  used_amount: number
  request_count: number
  status: number
  type: number
  priority: number
  created_at: number
  accessed_at: number
  test_at: number
  balance_updated_at: number
}

export type CreateChannelRequest = {
  type: number
  name: string
  key: string
  base_url: string
  models: string[]
  model_mapping: Record<string, string>
}

export enum ChannelStatus {
  ChannelStatusUnknown = 0,
  ChannelStatusEnabled = 1,
  ChannelStatusDisabled = 2,
  ChannelStatusAutoDisabled = 3
}

export type ChannelType = `${number}`

export type ChannelTypeMapName = {
  [key in ChannelType]: string
}
