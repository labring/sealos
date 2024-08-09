import type { NextRequest } from 'next/server'

import { ERROR_ENUM } from '../error'

export const authSession = async (req: NextRequest) => {
  if (!req.headers) return Promise.reject(ERROR_ENUM.unAuthorization)

  const { authorization } = req.headers as any // TODO: ts error

  if (!authorization) return Promise.reject(ERROR_ENUM.unAuthorization)

  try {
    const kubeConfig = decodeURIComponent(authorization)
    return Promise.resolve(kubeConfig)
  } catch (err) {
    return Promise.reject(ERROR_ENUM.unAuthorization)
  }
}
