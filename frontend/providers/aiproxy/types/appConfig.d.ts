export type AppConfigType = {
  auth: {
    appTokenJwtKey: string
    aiProxyBackendKey: string
  }
  backend: {
    aiproxy: string
    aiproxyInternal: string
  }
}

declare global {
  // eslint-disable-next-line no-var
  var AppConfig: AppConfigType | undefined
}
