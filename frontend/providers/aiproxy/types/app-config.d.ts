export type AppConfigType = {
  common: {
    docUrl: string
    isInvitationActive: boolean
    invitationUrl: string
  }
  auth: {
    appTokenJwtKey: string
    aiProxyBackendKey: string
    accountServerTokenJwtKey: string
  }
  backend: {
    aiproxy: string
    aiproxyInternal: string
    accountServer: string
  }
  adminNameSpace: string[]
  currencySymbol: 'shellCoin' | 'cny' | 'usd'
}

declare global {
  // eslint-disable-next-line no-var
  var AppConfig: AppConfigType | undefined
}
