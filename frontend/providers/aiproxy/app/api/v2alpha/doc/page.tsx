'use client';

import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getAppToken } from '@/utils/frontend/user';

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
      preferredSecurityScheme: ['bearerAuth'],
      securitySchemes: {
        bearerAuth: {
          token: getAppToken(),
        },
      },
    },
  };

  return <ApiReferenceReact configuration={config} />;
}
