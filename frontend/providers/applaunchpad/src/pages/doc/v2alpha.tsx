'use client';

import { useMemo } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getUserKubeConfig } from '@/utils/user';

import { createOpenApiDocument } from '@/types/v2alpha/openapi';

import '@scalar/api-reference-react/style.css';

export default function ApiV2AlphaDocsPage() {
  // Create document at runtime to use the current domain from window.location
  const document = useMemo(() => createOpenApiDocument(), []);

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
