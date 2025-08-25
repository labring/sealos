import { GET } from './index'

export const getNetworkList = async () => {
  const { networks } = await GET('/api/v1/getNetworkList')
  return networks
}

export interface NetworkResponse {
  address: string
  port: number
  protocol: string
  name: string
  namespace: string
}
