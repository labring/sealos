import { ChannelType } from '@/types/admin/channels/channelInfo'

export interface ModelInfo {
  image_prices: number[] | null
  model: string
  owner: string
  image_batch_size: number
  type: number
  input_price: number
  output_price: number
}

export type ChannelWithMode = {
  [K in ChannelType]?: ModelInfo[]
}

export type ChannelDefaultModeMapping = {
  [K in ChannelType]?: {
    [modelKey: string]: string
  }
}

export type ChannelDefaultModel = {
  [K in ChannelType]?: string[]
}

export type ChannelWithDefaultModelAndDefaultModeMapping = {
  mapping: ChannelDefaultModeMapping
  models: ChannelDefaultModel
}

export interface TokenConfig {
  max_input_tokens: number
  max_output_tokens: number
  max_context_tokens: number
}

export interface ModelConfig extends ModelInfo {
  config: TokenConfig
  created_at: number
  updated_at: number
}
