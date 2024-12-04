import { GET, POST, DELETE, PUT } from '@/utils/frontend/request'
import { ChannelQueryParams, GetChannelsResponse } from '@/app/api/admin/channels/route'
import { CreateChannelRequest } from '@/types/admin/channels/channelInfo'
import { ApiResp } from '@/types/api'
import { GetOptionResponse } from '@/app/api/admin/option/route'
import { BatchOptionData } from '@/types/admin/option'
import { GetEnabledModelsResponse } from '@/app/api/models/enabled/route'
import { GetTokensQueryParams, GetTokensResponse } from '@/app/api/user/token/route'
import { TokenInfo } from '@/types/user/token'
import { UserLogSearchResponse } from '@/app/api/user/log/route'
import { UserLogQueryParams } from '@/app/api/user/log/route'
import { GlobalLogQueryParams, GlobalLogSearchResponse } from '@/app/api/admin/log/route'
import { GetAllChannelEnabledModelsResponse } from '@/app/api/models/builtin/channel/route'
import { GetDefaultModelAndModeMappingResponse } from '@/app/api/models/default/route'
import { GetChannelTypeNamesResponse } from '@/app/api/admin/channels/type-names/route'

export const initAppConfig = () =>
  GET<{ aiproxyBackend: string; currencySymbol: 'shellCoin' | 'cny' | 'usd' }>(
    '/api/init-app-config'
  )

// user
export const getEnabledMode = () => GET<GetEnabledModelsResponse['data']>('/api/models/enabled')

// log
export const getUserLogs = (params: UserLogQueryParams) =>
  GET<UserLogSearchResponse['data']>('/api/user/log', params)

// token
export const getTokens = (params: GetTokensQueryParams) =>
  GET<GetTokensResponse['data']>('/api/user/token', params)

export const createToken = (name: string) =>
  POST<ApiResp<TokenInfo>['data']>('/api/user/token', { name })

export const deleteToken = (id: number) => DELETE(`/api/user/token/${id}`)

export const updateToken = (id: number, status: number) =>
  POST<ApiResp>(`/api/user/token/${id}`, { status: status })

// ------------------------------------------------------------
// admin

export const getChannels = (params: ChannelQueryParams) =>
  GET<GetChannelsResponse['data']>('/api/admin/channels', params)

// channel
export const createChannel = (params: CreateChannelRequest) =>
  POST<ApiResp>('/api/admin/channels', params)

export const updateChannel = (params: CreateChannelRequest, id: string) =>
  PUT<ApiResp>(`/api/admin/channels/${id}`, params)

export const getChannelTypeNames = () =>
  GET<GetChannelTypeNamesResponse['data']>('/api/admin/channels/type-names')

// channel built-in support models and default model default mode mapping
export const getChannelBuiltInSupportModels = () =>
  GET<GetAllChannelEnabledModelsResponse['data']>('/api/models/builtin/channel')

export const getChannelDefaultModelAndDefaultModeMapping = () =>
  GET<GetDefaultModelAndModeMappingResponse['data']>('/api/models/default')

// option
export const getOption = () => GET<GetOptionResponse['data']>('/api/admin/option')

export const updateOption = (params: { key: string; value: string }) =>
  PUT<ApiResp>(`/api/admin/option/`, params)

export const batchOption = (params: BatchOptionData) =>
  PUT<ApiResp>(`/api/admin/option/batch`, params)

// log
export const getGlobalLogs = (params: GlobalLogQueryParams) =>
  GET<GlobalLogSearchResponse['data']>('/api/admin/log', params)
