'use client';

import { Suspense, useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';

import '@scalar/api-reference-react/style.css';

function ApiDocsContent() {
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/v2alpha/openapi');
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
    content: apiData ? JSON.stringify(apiData) : undefined,
    theme: 'purple',
    layout: 'modern',
    hideModels: true,
    hideDownloadButton: false,
    darkMode: true,
    showSidebar: true,
  };

  if (!apiData) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '18px',
        }}
      >
        Loading API Documentation...
      </div>
    );
  }

  return <ApiReferenceReact configuration={config} />;
}

export default function ApiDocsPage() {
  return (
    <Suspense fallback={
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '18px',
        }}
      >
        Loading...
      </div>
    }>
      <ApiDocsContent />
    </Suspense>
  );
}

