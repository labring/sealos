import { useSessionStore } from '@/store/session'

export const getAppToken = () => {
  let token = process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : ''

  if (!token) {
    // 从 store 获取 token
    const { session } = useSessionStore.getState()
    if (session?.token) {
      token = session.token
    }
  }

  return token
}
