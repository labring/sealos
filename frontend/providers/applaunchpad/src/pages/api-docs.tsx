import { ApiReferenceReact } from '@scalar/api-reference-react';
import { openApiDocument } from '@/types/openapi';
import { getUserKubeConfig } from '@/utils/user';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { useClientAppConfig } from '@/hooks/useClientAppConfig';

import '@scalar/api-reference-react/style.css';

export default function References() {
  const isClient = useClientSideValue(true);
  const appConfig = useClientAppConfig();

  const config = {
    content: openApiDocument(appConfig.domain),
    authentication: {
      preferredSecurityScheme: ['kubeconfigAuth'],
      securitySchemes: {
        kubeconfigAuth: {
          in: 'header',
          name: 'Authorization',
          value: encodeURIComponent(getUserKubeConfig() || '')
        }
      }
    }
    // cdn: process.env.NEXT_PUBLIC_MOCK_USER
    //   ? undefined
    //   : `https://devbox.${SEALOS_DOMAIN}/scalar/cdn.js`
  };
  return isClient ? <ApiReferenceReact configuration={config} /> : null;
}
