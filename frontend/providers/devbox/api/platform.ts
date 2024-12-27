import { GET, POST } from '@/services/request'
import type { UserQuotaItemType, UserTask } from '@/types/user'
import type { Env } from '@/types/static'
import { getSessionFromSessionStorage } from '@/utils/user'
export const getAppEnv = () => GET<Env>('/api/getEnv')

export const getUserQuota = () =>
  GET<{
    quota: UserQuotaItemType[]
  }>('/api/platform/getQuota')

export const getRuntime = () => GET('/api/platform/getRuntime')

export const getResourcePrice = () => GET('/api/platform/resourcePrice')

export const postAuthCname = (data: { publicDomain: string; customDomain: string }) =>
  POST('/api/platform/authCname', data)

export const getUserTasks = () =>
  GET<{ needGuide: boolean; task: UserTask }>('/api/guide/getTasks', undefined, {
    headers: {
      Authorization: getSessionFromSessionStorage()
    }
  })

export const checkUserTask = () =>
  GET('/api/guide/checkTask', undefined, {
    headers: {
      Authorization: getSessionFromSessionStorage()
    }
  })
