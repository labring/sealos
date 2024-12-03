export async function isAdmin(namespace: string): Promise<string> {
  if (!namespace) {
    return Promise.reject('Admin: Invalid namespace')
  }
  try {
    if (global.AppConfig?.adminNameSpace.includes(namespace)) {
      return namespace
    }
    return Promise.reject('Admin: Invalid namespace')
  } catch (error) {
    console.error('Admin: check namespace error:', error)
    return Promise.reject('Admin: Invalid namespace')
  }
}
