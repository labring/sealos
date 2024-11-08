import { GET } from './index'

export const getDevboxDetail = async (token: string) => {
  const { devbox } = await GET('/api/v1/getDevboxDetail', {
    authorization: token,
  })
  return devbox
}
