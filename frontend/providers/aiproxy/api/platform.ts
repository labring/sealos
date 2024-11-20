import { KeysSearchResponse } from '@/app/api/get-keys/route'
import { QueryParams, SearchResponse } from '@/app/api/get-logs/route'
import { QueryParams as KeysQueryParams } from '@/app/api/get-keys/route'
import { GET, POST, DELETE } from '@/utils/request'
import { ModelPrice } from '@/types/backend'

export const initAppConfig = () =>
  GET<{ aiproxyBackend: string; currencySymbol: 'shellCoin' | 'cny' | 'usd' }>(
    '/api/init-app-config'
  )

export const getModels = () => GET<string[]>('/api/get-models')

export const getModelPrices = () => GET<ModelPrice[]>('/api/get-mode-price')

export const getLogs = (params: QueryParams) => GET<SearchResponse['data']>('/api/get-logs', params)

export const getKeys = (params: KeysQueryParams) =>
  GET<KeysSearchResponse['data']>('/api/get-keys', params)

export const createKey = (name: string) => POST('/api/create-key', { name })

export const deleteKey = (id: number) => DELETE(`/api/delete-key/${id}`)

export const updateKey = (id: number, status: number) => POST(`/api/update-key/${id}`, { status })
