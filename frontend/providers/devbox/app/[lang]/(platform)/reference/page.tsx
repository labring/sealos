'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';

import { useEnvStore } from '@/stores/env';
import { openApiDocument } from '@/app/api/openapi';
import { getDesktopSessionFromSessionStorage, getSessionFromSessionStorage } from '@/utils/user';

import '@scalar/api-reference-react/style.css';

export default function References() {
  const { env } = useEnvStore();

  const devboxToken = getSessionFromSessionStorage();
  const session = getDesktopSessionFromSessionStorage();

  const config = {
    content: openApiDocument,
    authentication: {
      preferredSecurityScheme: ['kubeconfigAuth', 'jwtAuth'],
      securitySchemes: {
        kubeconfigAuth: {
          in: 'header',
          name: 'Authorization',
          value: session?.kubeconfig || ''
        },
        jwtAuth: {
          in: 'header',
          name: 'Authorization-Bearer',
          value: devboxToken || session?.token || ''
        }
      }
    },
    cdn: process.env.NEXT_PUBLIC_MOCK_USER
      ? undefined
      : `https://devbox.${env.sealosDomain}/scalar/cdn.js`
  };
  return <ApiReferenceReact configuration={config} />;
}
