import { GET, POST } from '@/utils/request'

export const initAppConfig = () => GET('/api/init-app-config')

export const getModels = () => GET<string[]>('/api/get-models')
