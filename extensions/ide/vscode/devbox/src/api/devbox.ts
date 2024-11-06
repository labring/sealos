import { GET } from './index'

export const getDevboxDetail = async () => {
  const { devbox } = await GET('/api/v1/getDevboxDetail')
  return devbox
}
