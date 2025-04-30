'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';

import { openApiDocument } from '@/api/openapi';

import { SEALOS_DOMAIN } from '@/store/static';
import { getUserKubeConfig } from '@/utils/user';

import '@scalar/api-reference-react/style.css';

export default function References() {
  const config = {
    content: openApiDocument(SEALOS_DOMAIN),
    authentication: {
      preferredSecurityScheme: ['kubeconfigAuth'],
      securitySchemes: {
        kubeconfigAuth: {
          in: 'header',
          name: 'Authorization',
          value: encodeURIComponent(getUserKubeConfig() || '')
        }
      }
    },
    cdn: process.env.NEXT_PUBLIC_MOCK_USER
      ? undefined
      : `https://devbox.${SEALOS_DOMAIN}/scalar/cdn.js`
  };
  return <ApiReferenceReact configuration={config} />;
}
