import { ApiReference } from '@scalar/nextjs-api-reference';
import { openApiDocument } from '../api/openapi';

const config = {
  spec: {
    content: openApiDocument,
    authentication: {
      preferredSecurityScheme: ['kubeconfigAuth', 'jwtAuth'],
      securitySchemes: {
        kubeconfigAuth: {
          in: 'header',
          name: 'Authorization',
          value: process.env.SCALAR_USE_KC // prefill kubeconfig
        },
        jwtAuth: {
          in: 'header',
          name: 'Authorization-Bearer',
          value: process.env.SCALAR_USE_TOKEN // prefill jwt token
        }
      }
    },
    cdn: process.env.NEXT_PUBLIC_MOCK_USER
      ? undefined
      : `https://devbox.${process.env.SEALOS_DOMAIN}/scalar/cdn.js`
  }
};

export const GET = ApiReference(config);
