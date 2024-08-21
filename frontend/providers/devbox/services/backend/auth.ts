import { ERROR_ENUM } from '../error'

export const authSession = async (headers: Headers) => {
  if (!headers) return Promise.reject(ERROR_ENUM.unAuthorization)

  const authorization = headers.get('Authorization') || null

  if (!authorization) return Promise.reject(ERROR_ENUM.unAuthorization)

  try {
    const kubeConfig = decodeURIComponent(authorization)
    return Promise.resolve(kubeConfig)
  } catch (err) {
    return Promise.reject(ERROR_ENUM.unAuthorization)
  }
}
