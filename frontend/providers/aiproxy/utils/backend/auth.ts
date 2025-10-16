import jwt from 'jsonwebtoken'

import { getNamespaceFromKubeConfigString, verifyK8sConfigString } from './check-kc'

// Token payload
interface AppTokenPayload {
  workspaceUid: string
  workspaceId: string
  regionUid: string
  userCrUid: string
  userCrName: string
  userId: string
  userUid: string
  iat: number
  exp: number
}

type RealNameInfoResponse = {
  data: {
    userID: string
    isRealName: boolean
  }
  error?: string
  message: string
}

export async function kcOrAppTokenAuth(headers: Headers): Promise<string> {
  const authToken = headers.get('authorization')
  if (!authToken) {
    return Promise.reject('Auth: Token is missing')
  }

  // Remove 'Bearer ' prefix if present
  const token = authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken

  // Check if it's a JWT token (contains dots) or Kubernetes config
  if (isJwtToken(token)) {
    // Handle JWT token validation
    try {
      const decoded = jwt.verify(
        token,
        global.AppConfig?.auth.appTokenJwtKey || process.env.APP_TOKEN_JWT_KEY || ''
      ) as AppTokenPayload
      const now = Math.floor(Date.now() / 1000)
      if (decoded.exp && decoded.exp < now) {
        return Promise.reject('Auth: Token expired')
      }
      if (!decoded.workspaceId) {
        return Promise.reject('Auth: Invalid token')
      }
      return decoded.workspaceId
    } catch (error) {
      console.error('Auth: JWT Token parsing error:', error)
      return Promise.reject('Auth: Invalid JWT token')
    }
  } else {
    // Handle Kubernetes config validation
    try {
      const isK8sConfigValid = await verifyK8sConfigString(token)
      if (!isK8sConfigValid) {
        return Promise.reject('Auth: Invalid Kubernetes config')
      }

      const namespace = getNamespaceFromKubeConfigString(token)
      return namespace
    } catch (error) {
      console.error('Auth: Kubernetes config validation error:', error)
      return Promise.reject('Auth: Invalid Kubernetes config')
    }
  }
}

/**
 * Check if the token is a JWT token (contains dots separating header, payload, signature)
 */
function isJwtToken(token: string): boolean {
  return token.includes('.') && token.split('.').length === 3
}

export async function parseJwtToken(headers: Headers): Promise<string> {
  try {
    const token = headers.get('authorization')
    if (!token) {
      return Promise.reject('Auth: Token is missing')
    }

    const decoded = jwt.verify(
      token,
      global.AppConfig?.auth.appTokenJwtKey || process.env.APP_TOKEN_JWT_KEY || ''
    ) as AppTokenPayload
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && decoded.exp < now) {
      return Promise.reject('Auth: Token expired')
    }
    if (!decoded.workspaceId) {
      return Promise.reject('Auth: Invalid token')
    }
    return decoded.workspaceId
  } catch (error) {
    console.error('Auth: Token parsing error:', error)
    return Promise.reject('Auth: Invalid token')
  }
}

export async function checkSealosUserIsRealName(headers: Headers): Promise<boolean> {
  if (!global.AppConfig?.backend.accountServer) {
    console.warn('CheckSealosUserIsRealName: Account server is not set')
    return true
  }

  if (!global.AppConfig?.auth.accountServerTokenJwtKey) {
    console.warn('CheckSealosUserIsRealName: Account server token jwt key is not set')
    return true
  }

  try {
    const token = headers.get('authorization')
    if (!token) {
      console.error('CheckSealosUserIsRealName: Token is missing')
      return false
    }

    const decoded = jwt.verify(
      token,
      global.AppConfig?.auth.appTokenJwtKey || ''
    ) as AppTokenPayload
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && decoded.exp < now) {
      console.error('CheckSealosUserIsRealName: Token expired')
      return false
    }

    if (!decoded.userUid && !decoded.userId) {
      console.error('CheckSealosUserIsRealName: User uid or user id is missing, token is invalid')
      return false
    }

    const accountServerToken = jwt.sign(
      {
        userUid: decoded.userUid,
        userId: decoded.userId,
      },
      global.AppConfig?.auth.accountServerTokenJwtKey,
      { expiresIn: '1h' }
    )

    const response = await fetch(
      `${global.AppConfig?.backend.accountServer}/account/v1alpha1/real-name-info`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accountServerToken}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip,deflate,compress',
        },
        cache: 'no-store',
      }
    )
    const result: RealNameInfoResponse = await response.json()
    if (result.error) {
      console.error(result.error)
      return false
    }

    return result.data.isRealName
  } catch (error) {
    console.error('CheckSealosUserIsRealName: ', error)
    return false
  }
}
