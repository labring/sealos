'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';

import { document } from '@/types/apis/v2alpha';

export default function ApiV2AlphaDocsPage() {
  const config = {
    content: document,
    authentication: {
      preferredSecurityScheme: ['kubeconfigAuth', 'jwtAuth'],
      securitySchemes: {
        kubeconfigAuth: {
          in: 'header' as const,
          name: 'Authorization'
        },
        jwtAuth: {
          in: 'header' as const,
          name: 'Authorization-Bearer'
        }
      }
    }
  };

  return <ApiReferenceReact configuration={config} />;
}
