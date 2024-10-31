import { GET, POST } from '@/utils/request'

export const getAppEnv = () => GET('/api/getEnv')

export const getRuntime = () => GET('/api/platform/getRuntime')

export const postAuthCname = (data: { publicDomain: string; customDomain: string }) =>
  POST('/api/platform/authCname', data)

export const getModels = () => GET<string[]>('/api/user/get-models')
