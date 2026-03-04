'use client';
import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';

import '@scalar/api-reference-react/style.css';

export default function ApiDocsPage() {
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    fetch('/api/v2alpha/openapi')
      .then((res) => res.json())
      .then(setApiData)
      .catch(console.error);
  }, []);

  if (!apiData) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}
      >
        Loading...
      </div>
    );
  }

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
    }
  };

  return <ApiReferenceReact configuration={config} />;
}
