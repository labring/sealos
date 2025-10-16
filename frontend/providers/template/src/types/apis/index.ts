import * as z from 'zod';
import { createDocument } from 'zod-openapi';

import * as deleteInstanceSchemas from './delete-instance';
export * as deleteInstanceSchemas from './delete-instance';

export const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Template API',
    version: '1.0.0'
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Local development server'
    }
  ],
  components: {
    securitySchemes: {
      KubeconfigAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization'
      }
    }
  },
  paths: {
    '/instance/{instanceName}': {
      delete: {
        summary: 'Delete Instance',
        description: 'Delete an instance and all dependent resources.',
        security: [{ KubeconfigAuth: [] }],
        requestParams: {
          path: deleteInstanceSchemas.pathParams
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: deleteInstanceSchemas.response
              }
            }
          }
        }
      }
    }
  }
});
