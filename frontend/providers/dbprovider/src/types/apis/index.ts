import { createDocument } from 'zod-openapi';

import * as createDatabaseSchemas from './create-database';
export * as createDatabaseSchemas from './create-database';

import * as updateDatabaseSchemas from './update-database';
export * as updateDatabaseSchemas from './update-database';

import * as startDatabaseSchemas from './start-database';
export * as startDatabaseSchemas from './start-database';

import * as pauseDatabaseSchemas from './pause-database';
export * as pauseDatabaseSchemas from './pause-database';

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
    },
    '/database/{databaseName}/start': {
      post: {
        summary: 'Start Database',
        description: 'Start a database.',
        security: [{ KubeconfigAuth: [] }],
        requestParams: {
          path: startDatabaseSchemas.pathParams
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: startDatabaseSchemas.response
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/pause': {
      post: {
        summary: 'Pause Database',
        description: 'Pause a database.',
        security: [{ KubeconfigAuth: [] }],
        requestParams: {
          path: pauseDatabaseSchemas.pathParams
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: pauseDatabaseSchemas.response
              }
            }
          }
        }
      }
    }
  }
});
