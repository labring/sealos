import { document } from '@/types/apis';
import '@scalar/api-reference-react/style.css';
import { ApiReferenceReact } from '@scalar/api-reference-react';

export default function ApiDocs() {
  const config = {
    content: document
  };

  return <ApiReferenceReact configuration={config} />;
}
