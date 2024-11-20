import { NextResponse } from 'next/server'

import type { AppConfigType } from '@/types/appConfig'

export const dynamic = 'force-dynamic'

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
  if (process.env.CURRENCY_SYMBOL) {
    appConfig.currencySymbol = process.env.CURRENCY_SYMBOL as 'shellCoin' | 'cny' | 'usd'
  }
  return appConfig
}

function initAppConfig(): AppConfigType {
  // default config
  const DefaultAppConfig: AppConfigType = {
    auth: {
      appTokenJwtKey: '',
      aiProxyBackendKey: ''
    },
    backend: {
      aiproxy: '',
      aiproxyInternal: ''
    },
    currencySymbol: 'shellCoin'
  }
  if (!global.AppConfig) {
    try {
      global.AppConfig = getAppConfig(DefaultAppConfig)
    } catch (error) {
      console.error('Config initialization error:', error)
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
