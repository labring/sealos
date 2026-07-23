import { ChannelType } from './channels/channelInfo'

export interface BatchOptionData {
  DefaultChannelModelMapping: string
  DefaultChannelModels: string
}

export interface OptionData {
  ApproximateTokenEnabled: string
  AutomaticDisableChannelEnabled: string
  AutomaticEnableChannelWhenTestSucceedEnabled: string
  BillingEnabled: string
  CompletionPrice: string
  DefaultChannelModelMapping: string
  DefaultChannelModels: string
  DefaultGroupQPM: string
  DisableServe: string
  GeminiSafetySetting: string
  GeminiVersion: string
  GlobalApiRateLimitNum: string
  GroupMaxTokenNum: string
  ModelPrice: string
  RetryTimes: string
}

export type DefaultChannelModel = {
  [key in ChannelType]: string[]
}

export type DefaultChannelModelMapping = {
  [key in ChannelType]: {
    [modelKey: string]: string
  }
}
