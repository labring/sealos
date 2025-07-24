import { createDocument } from 'zod-openapi';

import * as createDatabaseSchemas from './create-database';
export * as createDatabaseSchemas from './create-database';

import * as updateDatabaseSchemas from './update-database';
export * as updateDatabaseSchemas from './update-database';

export const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Database API',
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
    '/database': {
      post: {
        summary: 'Create Database',
        description: 'Create a database.',
        security: [{ KubeconfigAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: createDatabaseSchemas.body
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: createDatabaseSchemas.response
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}': {
      patch: {
        summary: 'Update Database',
        description: "Update a database's resource limit.",
        security: [{ KubeconfigAuth: [] }],
        requestParams: {
          path: updateDatabaseSchemas.pathParams
        },
        requestBody: {
          content: {
            'application/json': {
              schema: updateDatabaseSchemas.body
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: updateDatabaseSchemas.response
              }
            }
          }
        }
      }
    }
  }
});
