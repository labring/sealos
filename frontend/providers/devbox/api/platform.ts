import { GET, POST } from '@/services/request'
import type { UserQuotaItemType } from '@/types/user'
import { SystemEnvResponse } from '@/app/api/getEnv/route'
import type { Response as resourcePriceResponse } from '@/app/api/platform/resourcePrice/route'

export const getAppEnv = () => GET<SystemEnvResponse>('/api/getEnv')

export const getUserQuota = () =>
  GET<{
    quota: UserQuotaItemType[]
  }>('/api/platform/getQuota')

export const getRuntime = () => GET('/api/platform/getRuntime')

export const getResourcePrice = () => GET<resourcePriceResponse>('/api/platform/resourcePrice')

export const postAuthCname = (data: { publicDomain: string; customDomain: string }) =>
  POST('/api/platform/authCname', data)

export const getNamespace = () => GET<string>('/api/platform/getNamespace')
