import { ApiReferenceReact } from '@scalar/api-reference-react';
import { document } from '@/types/apis';

import '@scalar/api-reference-react/style.css';

export default function ApiDocs() {
  const config = {
    content: document
  };
  return <ApiReferenceReact configuration={config} />;
}
