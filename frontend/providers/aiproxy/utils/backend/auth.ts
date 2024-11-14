import jwt from 'jsonwebtoken'

// Token payload 类型定义
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

export async function parseJwtToken(headers: Headers): Promise<string> {
  try {
    const token = headers.get('authorization')
    if (!token) {
      return Promise.reject('Token is missing')
    }

    const decoded = jwt.verify(
      token,
      global.AppConfig?.auth.appTokenJwtKey || ''
    ) as AppTokenPayload
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && decoded.exp < now) {
      return Promise.reject('Token expired')
    }
    if (!decoded.workspaceId) {
      return Promise.reject('Invalid token')
    }
    return decoded.workspaceId
  } catch (error) {
    console.error('Token parsing error:', error)
    return Promise.reject('Invalid token')
  }
}
