'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getUserKubeConfig } from '@/utils/user';

import { document } from '@/types/apis/v2alpha';

import '@scalar/api-reference-react/style.css';

export default function ApiV2AlphaDocsPage() {
  const config = {
    content: document,
    authentication: {
      preferredSecurityScheme: ['kubeconfigAuth'],
      securitySchemes: {
        kubeconfigAuth: {
          in: 'header' as const,
          name: 'Authorization',
          value: encodeURIComponent(getUserKubeConfig() || '')
        }
      }
    }
  };

  return <ApiReferenceReact configuration={config} />;
}
