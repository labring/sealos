import { GET } from './index'

export const getDevboxDetail = async (token: string, hostName: string) => {
  const { devbox } = await GET(
    `https://devbox.${hostName}/api/v1/getDevboxDetail`,
    {},
    {
      headers: {
        Authorization: encodeURIComponent(token),
      },
    }
  )
  return devbox
}
