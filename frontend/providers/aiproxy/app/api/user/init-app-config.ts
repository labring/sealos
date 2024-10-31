import { NextResponse } from 'next/server';

import type { AppConfigType } from '@/types/appConfig';

function getAppConfig(appConfig: AppConfigType): AppConfigType {
  if (process.env.appTokenJwtKey) {
    appConfig.auth.appTokenJwtKey = process.env.appTokenJwtKey;
  }
  if (process.env.aiProxyBackendKey) {
    appConfig.auth.aiProxyBackendKey = process.env.aiProxyBackendKey;
  }
  if (process.env.aiproxy) {
    appConfig.backend.aiproxy = process.env.aiproxy;
  }
  return appConfig;
}

export function initAppConfig(): AppConfigType {
  // default config
  const DefaultAppConfig: AppConfigType = {
    auth: {
      appTokenJwtKey: '',
      aiProxyBackendKey: ''
    },
    backend: {
      aiproxy: 'http://localhost:8080'
    }
  };
  if (!global.AppConfig) {
    try {
      global.AppConfig = getAppConfig(DefaultAppConfig);
    } catch (error) {
      console.error('Config initialization error:', error);
      global.AppConfig = DefaultAppConfig;
    }
  }

  return global.AppConfig;
}

export async function GET(): Promise<NextResponse> {
  try {
    const config = initAppConfig();

    return NextResponse.json({
      code: 200,
      message: 'Success',
      data: {
        aiproxyBackend: config.backend.aiproxy
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Config API error:', errorMessage);

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to load configuration',
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
