export const getUserSession = () => {
  let token: string =
    process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : ''

  try {
    const store = localStorage.getItem('session')
    if (!token && store) {
      token = JSON.parse(store)?.token
    }
  } catch (err) {
    err
  }
  return token
}
