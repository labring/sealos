import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import {
  CreateAppRequestSchema,
  SuccessResponseSchema,
  GetAppByAppNameQuerySchema,
  GetAppByAppNameResponseSchema,
  DeleteAppByNameQuerySchema,
  DeleteAppByNameResponseSchema
} from '../constants/schema';

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.string().optional()
});

// generate openapi document
export const openApiDocument = (sealosDomain: string) =>
  createDocument({
    openapi: '3.0.0',
    info: {
      title: 'Application Launch Pad API',
      version: '1.0.0',
      description: 'API documentation for Application Launch Pad service'
    },
    servers: [
      {
        url: `http://localhost:3000`,
        description: 'Development'
      },
      {
        url: `https://applaunchpad.${sealosDomain}`,
        description: 'Production'
      }
    ],
    components: {
      securitySchemes: {
        kubeconfigAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Kubeconfig for authentication'
        }
      }
    },
    security: [
      {
        kubeconfigAuth: []
      }
    ],
    paths: {
      '/api/v1alpha/createApp': {
        post: {
          summary: 'Create a new application',
          description: 'Create a new application with the specified configuration',
          requestBody: {
            content: {
              'application/json': {
                schema: CreateAppRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Application created successfully',
              content: {
                'application/json': {
                  schema: SuccessResponseSchema
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
      '/api/v1alpha/getAppByAppName': {
        get: {
          summary: 'Get application by name',
          description: 'Retrieve application details by application name',
          parameters: [
            {
              name: 'appName',
              in: 'query',
              description: 'Application name',
              required: true,
              schema: {
                type: 'string'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Application details retrieved successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    data: GetAppByAppNameResponseSchema
                  })
                }
              }
            },
            '400': {
              description: 'Invalid query parameters',
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
      '/api/v1alpha/delAppByName': {
        delete: {
          summary: 'Delete application',
          description: 'Delete an application by its name',
          parameters: [
            {
              name: 'name',
              in: 'query',
              description: 'Name of the application to delete',
              required: true,
              schema: {
                type: 'string'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Application deleted successfully',
              content: {
                'application/json': {
                  schema: DeleteAppByNameResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid query parameters',
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
