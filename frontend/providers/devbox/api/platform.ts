import { GET } from '@/services/request'
import { SystemEnvResponse } from '@/app/api/getEnv/route'

export const getAppEnv = () => GET<SystemEnvResponse>('/api/getEnv')
