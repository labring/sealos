import { NextResponse } from 'next/server'

import type { AppConfigType } from '@/types/app-config'

export const dynamic = 'force-dynamic'

function getAdminNamespaces(): string[] {
  return process.env.ADMIN_NAMESPACES?.split(',') || []
}

function getAppConfig(appConfig: AppConfigType): AppConfigType {
  if (process.env.APP_TOKEN_JWT_KEY) {
    appConfig.auth.appTokenJwtKey = process.env.APP_TOKEN_JWT_KEY
  }
  if (process.env.AI_PROXY_BACKEND_KEY) {
    appConfig.auth.aiProxyBackendKey = process.env.AI_PROXY_BACKEND_KEY
  }
  if (process.env.AI_PROXY_BACKEND) {
    appConfig.backend.aiproxy = process.env.AI_PROXY_BACKEND
  }
  if (process.env.AI_PROXY_BACKEND_INTERNAL) {
    appConfig.backend.aiproxyInternal = process.env.AI_PROXY_BACKEND_INTERNAL
  }
  if (process.env.ADMIN_NAMESPACES) {
    appConfig.adminNameSpace = getAdminNamespaces()
  }
  if (process.env.CURRENCY_SYMBOL) {
    appConfig.currencySymbol = process.env.CURRENCY_SYMBOL as 'shellCoin' | 'cny' | 'usd'
  }
  if (process.env.ACCOUNT_SERVER) {
    appConfig.backend.accountServer = process.env.ACCOUNT_SERVER
  }
  if (process.env.ACCOUNT_SERVER_TOKEN_JWT_KEY) {
    appConfig.auth.accountServerTokenJwtKey = process.env.ACCOUNT_SERVER_TOKEN_JWT_KEY
  }
  return appConfig
}

function initAppConfig(): AppConfigType {
  // default config
  const DefaultAppConfig: AppConfigType = {
    auth: {
      appTokenJwtKey: '',
      aiProxyBackendKey: '',
      accountServerTokenJwtKey: ''
    },
    backend: {
      aiproxy: '',
      aiproxyInternal: '',
      accountServer: ''
    },
    adminNameSpace: [],
    currencySymbol: 'shellCoin'
  }

  if (!global.AppConfig) {
    try {
      global.AppConfig = getAppConfig(DefaultAppConfig)
    } catch (error) {
      console.error('init-app-config: Config initialization error:', error)
      global.AppConfig = DefaultAppConfig
    }
  }

  return global.AppConfig
}

export async function GET(): Promise<NextResponse> {
  try {
    const config = initAppConfig()

    return NextResponse.json({
      code: 200,
      message: 'Success',
      data: {
        aiproxyBackend: config.backend.aiproxy,
        currencySymbol: config.currencySymbol
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Config API error:', errorMessage)

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to load configuration',
        error: errorMessage
      },
      { status: 500 }
    )
  }
}
