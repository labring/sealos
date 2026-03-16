'use client';
import { useEffect, useState, Suspense } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { useClientAppConfig } from '@/hooks/useClientAppConfig';

import '@scalar/api-reference-react/style.css';

function ApiDocsContent() {
  const clientAppConfig = useClientAppConfig();
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const openapiResponse = await fetch('/api/openapi');
        if (!openapiResponse.ok) {
          throw new Error(`API request failed: ${openapiResponse.status}`);
        }

        const data = await openapiResponse.json();
        setApiData(data);
      } catch (error) {
        console.error('Error fetching API data:', error);
      }
    };
    fetchData();
  }, []);

  const config = {
    content: JSON.stringify(apiData),
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
    },
    cdn: process.env.NEXT_PUBLIC_MOCK_USER
      ? undefined
      : `https://devbox.${clientAppConfig.cloud.domain}/scalar/cdn.js`
  };

  if (!apiData) {
    return <div>Loading...</div>;
  }

  return <ApiReferenceReact configuration={config} />;
}

export default function References() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ApiDocsContent />
    </Suspense>
  );
}
