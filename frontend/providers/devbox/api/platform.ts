import { GET } from '@/services/request'
import type { UserQuotaItemType } from '@/types/user'
import { SystemEnvResponse } from '@/app/api/getEnv/route'
import type { Response as DBVersionMapType } from '@/app/api/platform/getDBVersion'
import type { Response as RuntimeVersionMapType } from '@/app/api/platform/getRuntimeVersion'

export const getAppEnv = () => GET<SystemEnvResponse>('/api/getEnv')

export const getUserQuota = () =>
  GET<{
    quota: UserQuotaItemType[]
  }>('/api/platform/getQuota')

// TODO: 这里需要支持一下获取运行时和数据库的版本信息
export const getDBVersionMap = () => GET<DBVersionMapType>('/api/platform/getDBVersion')

export const getRuntimeVersionMap = () =>
  GET<RuntimeVersionMapType>('/api/platform/getRuntimeVersion')
