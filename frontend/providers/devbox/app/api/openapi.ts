import { z } from 'zod';
import { createDocument, extendZodWithOpenApi } from 'zod-openapi';
import {
  RequestSchema as CreateDevboxRequestSchema,
  SuccessResponseSchema as CreateDevboxSuccessResponseSchema,
  HeaderSchema as CreateDevboxHeaderSchema
} from './createDevbox/schema';
import {
  RequestSchema as ListOfficialRequestSchema,
  SuccessResponseSchema as ListOfficialSuccessResponseSchema
} from './templateRepository/listOfficial/schema';
import {
  HeaderSchema as ListTemplatesHeaderSchema,
  RequestSchema as ListTemplatesRequestSchema,
  SuccessResponseSchema as ListTemplatesSuccessResponseSchema
} from './templateRepository/template/list/schema';

// extend zod with openapi
extendZodWithOpenApi(z);

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.string().optional()
});

// generate openapi document
export const openApiDocument = createDocument({
  openapi: '3.0.0',
  info: {
    title: 'Devbox API',
    version: '1.0.0',
    description: 'API documentation for Devbox service'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server'
    }
  ],
  paths: {
    '/api/createDevbox': {
      post: {
        summary: 'Create a new devbox',
        description:
          'Create a new devbox, you need to use the /api/templateRepository/listOfficial interface to get the runtime list before using this interface, for the requestBody templateRepositoryUid; you need to use the /api/templateRepository/template/list interface to get the specific version list of the runtime, for the requestBody templateUid, templateConfig and image',
        requestParams: {
          header: CreateDevboxHeaderSchema
        },
        requestBody: {
          content: {
            'application/json': {
              schema: CreateDevboxRequestSchema
            }
          }
        },
        responses: {
          '200': {
            description: 'Devbox created successfully',
            content: {
              'application/json': {
                schema: CreateDevboxSuccessResponseSchema
              }
            }
          },
          '400': {
            description: 'Invalid request body',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '404': {
            description: 'Template not found',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '409': {
            description: 'Devbox already exists',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          }
        }
      }
    },
    '/api/templateRepository/listOfficial': {
      get: {
        summary: 'Get the official runtime list',
        description: 'Get all available official runtime lists, no authentication required',
        responses: {
          '200': {
            description: 'Successfully retrieved official runtime list',
            content: {
              'application/json': {
                schema: ListOfficialSuccessResponseSchema
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          }
        }
      }
    },
    '/api/templateRepository/template/list': {
      get: {
        summary: 'Get the runtime version list of the specified runtime',
        description:
          'Get all available runtime version list of the specified runtime, need JWT authentication',
        requestParams: {
          header: ListTemplatesHeaderSchema,
          query: ListTemplatesRequestSchema
        },
        responses: {
          '200': {
            description: 'Successfully retrieved runtime version list',
            content: {
              'application/json': {
                schema: ListTemplatesSuccessResponseSchema
              }
            }
          },
          '400': {
            description: 'Invalid request body',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '404': {
            description: 'Repository not found',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          }
        }
      }
    }
  }
});
