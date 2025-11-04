'use client';

import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';

import { useEnvStore } from '@/stores/env';

import '@scalar/api-reference-react/style.css';

export default function References() {
  const { env } = useEnvStore();
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/openapi');
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
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
      : `https://devbox.${env.sealosDomain}/scalar/cdn.js`
  };

  if (!apiData) {
    return <div>Loading...</div>;
  }

  return <ApiReferenceReact configuration={config} />;
}
