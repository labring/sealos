import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import { RequestSchema, SuccessResponseSchema } from './schema';

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
        url: `http://127.0.0.1:3000`,
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
                schema: RequestSchema
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
      }
    }
  });
