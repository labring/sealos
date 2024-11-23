import { KeysSearchResponse } from '@/app/api/get-keys/route'
import { QueryParams, SearchResponse } from '@/app/api/get-logs/route'
import { QueryParams as KeysQueryParams } from '@/app/api/get-keys/route'
import { GET, POST, DELETE } from '@/utils/frontend/request'
import { ModelPrice } from '@/types/backend'
import { ChannelQueryParams, GetChannelsResponse } from '@/app/api/admin/channels/route'
import { CreateChannelRequest } from '@/types/admin/channels/channelInfo'
import { ApiResp } from '@/types/api'
import { GetModelsResponse } from '@/app/api/models/route'
import { GetDefaultEnabledModelsResponse } from '@/app/api/models/enabled/default/route'
// user
export const initAppConfig = () => GET<{ aiproxyBackend: string }>('/api/init-app-config')

export const getModels = () => GET<string[]>('/api/get-models')

export const getModelPrices = () => GET<ModelPrice[]>('/api/get-mode-price')

export const getLogs = (params: QueryParams) => GET<SearchResponse['data']>('/api/get-logs', params)

export const getKeys = (params: KeysQueryParams) =>
  GET<KeysSearchResponse['data']>('/api/get-keys', params)

export const createKey = (name: string) => POST('/api/create-key', { name })

export const deleteKey = (id: number) => DELETE(`/api/delete-key/${id}`)

export const updateKey = (id: number, status: number) => POST(`/api/update-key/${id}`, { status })

// admin
export const getChannels = (params: ChannelQueryParams) =>
  GET<GetChannelsResponse['data']>('/api/admin/channels', params)

export const createChannel = (params: CreateChannelRequest) =>
  POST<ApiResp>('/api/admin/channels', params)

export const getBuiltInSupportModels = () => GET<GetModelsResponse['data']>('/api/models')

export const getDefaultEnabledModels = () =>
  GET<GetDefaultEnabledModelsResponse>('/api/models/enabled/default')
