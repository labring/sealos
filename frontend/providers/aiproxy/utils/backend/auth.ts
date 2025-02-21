import jwt from 'jsonwebtoken'

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

export async function parseJwtToken(headers: Headers): Promise<string> {
  try {
    const token = headers.get('authorization')
    if (!token) {
      return Promise.reject('Auth: Token is missing')
    }

    const decoded = jwt.verify(
      token,
      global.AppConfig?.auth.appTokenJwtKey || ''
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
        userId: decoded.userId
      },
      global.AppConfig?.auth.accountServerTokenJwtKey,
      { expiresIn: '5d' }
    )

    const response = await fetch(
      `${global.AppConfig?.backend.accountServer}/account/v1alpha1/real-name-info`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accountServerToken}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip,deflate,compress'
        },
        cache: 'no-store'
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
