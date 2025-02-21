import { GET, POST, DELETE, PUT } from '@/utils/frontend/request'
import { ChannelQueryParams, GetChannelsResponse } from '@/app/api/admin/channel/route'
import { ChannelStatus, CreateChannelRequest } from '@/types/admin/channels/channelInfo'
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
import { GetChannelTypeNamesResponse } from '@/app/api/admin/channel/type-name/route'
import { GroupQueryParams, GroupStatus } from '@/types/admin/group'
import { GroupSearchResponse } from '@/app/api/admin/group/route'
import { GetAllChannelResponse } from '@/app/api/admin/channel/all/route'
import { DashboardQueryParams } from '@/app/api/user/dashboard/route'
import { DashboardResponse } from '@/types/user/dashboard'
import { UserLogDetailResponse } from '@/app/api/user/log/detail/[log_id]/route'

export const initAppConfig = () =>
  GET<{
    aiproxyBackend: string
    currencySymbol: 'shellCoin' | 'cny' | 'usd'
    docUrl: string
    isInvitationActive: boolean
    invitationUrl: string
  }>('/api/init-app-config')

// <user>
export const getEnabledMode = () => GET<GetEnabledModelsResponse['data']>('/api/models/enabled')

// log
export const getUserLogs = (params: UserLogQueryParams) =>
  GET<UserLogSearchResponse['data']>('/api/user/log', params)

export const getUserLogDetail = (log_id: number) =>
  GET<UserLogDetailResponse['data']>(`/api/user/log/detail/${log_id}`)

// token
export const getTokens = (params: GetTokensQueryParams) =>
  GET<GetTokensResponse['data']>('/api/user/token', params)

export const createToken = (name: string) =>
  POST<ApiResp<TokenInfo>['data']>('/api/user/token', { name })

export const deleteToken = (id: number) => DELETE(`/api/user/token/${id}`)

export const updateToken = (id: number, status: number) =>
  POST<ApiResp>(`/api/user/token/${id}`, { status: status })

// dashboard
export const getDashboardData = (params: DashboardQueryParams) =>
  GET<DashboardResponse['data']>('/api/user/dashboard', params)
// ------------------------------------------------------------
// <admin>

export const getChannels = (params: ChannelQueryParams) =>
  GET<GetChannelsResponse['data']>('/api/admin/channel', params)

// channel
export const createChannel = (params: CreateChannelRequest) =>
  POST<ApiResp>('/api/admin/channel', params)

export const updateChannel = (params: CreateChannelRequest, id: string) =>
  PUT<ApiResp>(`/api/admin/channel/${id}`, params)

export const updateChannelStatus = (id: string, status: ChannelStatus) =>
  POST<ApiResp>(`/api/admin/channel/${id}/status`, { status })

export const getChannelTypeNames = () =>
  GET<GetChannelTypeNamesResponse['data']>('/api/admin/channel/type-name')

export const getAllChannels = () => GET<GetAllChannelResponse['data']>('/api/admin/channel/all')

export const deleteChannel = (id: string) => DELETE(`/api/admin/channel/${id}`)

export const uploadChannels = (formData: FormData) =>
  POST<ApiResp>('/api/admin/channel/upload', formData, {
    headers: {
      // Don't set Content-Type header here, it will be automatically set with the correct boundary
    }
  })

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

export const uploadOptions = (formData: FormData) =>
  POST<ApiResp>('/api/admin/option/upload', formData, {
    headers: {
      // Don't set Content-Type header here, it will be automatically set with the correct boundary
    }
  })

// log
export const getGlobalLogs = (params: GlobalLogQueryParams) =>
  GET<GlobalLogSearchResponse['data']>('/api/admin/log', params)

// group
export const getGroups = (params: GroupQueryParams) =>
  GET<GroupSearchResponse['data']>('/api/admin/group', params)

export const updateGroupStatus = (id: string, status: GroupStatus) =>
  POST<ApiResp>(`/api/admin/group/${id}/status`, { status })

export const updateGroupQpm = (id: string, qpm: number) =>
  POST<ApiResp>(`/api/admin/group/${id}/qpm`, { qpm })

export const deleteGroup = (id: string) => DELETE(`/api/admin/group/${id}`)
