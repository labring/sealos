'use client';

import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';

import { useEnvStore } from '@/stores/env';
import { getDesktopSessionFromSessionStorage, getSessionFromSessionStorage } from '@/utils/user';

import '@scalar/api-reference-react/style.css';

export default function References() {
  const { env } = useEnvStore();
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const devboxToken = getSessionFromSessionStorage();
  const session = getDesktopSessionFromSessionStorage();
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/openapi');
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        setApiData(data);
      } catch (error) {
        // @ts-ignore
        setError(error.message);
      } finally {
        setLoading(false);
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
          name: 'Authorization',
          value: encodeURIComponent(session?.kubeconfig || '')
        },
        jwtAuth: {
          in: 'header' as const,
          name: 'Authorization-Bearer',
          value: encodeURIComponent(devboxToken || session?.token || '')
        }
      }
    },
    cdn: process.env.NEXT_PUBLIC_MOCK_USER
      ? undefined
      : `https://devbox.${env.sealosDomain}/scalar/cdn.js`
  };

  return <ApiReferenceReact configuration={config} />;
}
