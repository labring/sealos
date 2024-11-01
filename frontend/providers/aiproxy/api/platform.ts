import { KeysSearchResponse } from '@/app/api/get-keys/route'
import { QueryParams, SearchResponse } from '@/app/api/get-logs/route'
import { GET, POST } from '@/utils/request'

export const initAppConfig = () => GET('/api/init-app-config')

export const getModels = () => GET<string[]>('/api/get-models')

export const getLogs = (params: QueryParams) => GET<SearchResponse['data']>('/api/get-logs', params)

export const getKeys = () => GET<KeysSearchResponse['data']>('/api/get-keys')

export const createKey = (name: string) => POST('/api/create-key', { name })
