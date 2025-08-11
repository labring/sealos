import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import { LaunchpadApplicationSchema } from '@/types/schema';
import {
  CreateLaunchpadRequestSchema,
  DeleteAppByNameResponseSchema,
  GetAppByAppNameResponseSchema,
  GetAppPodsByAppNameResponseSchema,
  UpdateAppResourcesSchema
} from './request_schema';

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.string().optional(),
  error: z.string().optional()
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
      '/api/v1/app': {
        post: {
          summary: 'Create a new application',
          description: 'Create a new application with standardized configuration format',
          requestBody: {
            content: {
              'application/json': {
                schema: CreateLaunchpadRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Application created successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    data: z.object({
                      message: z.string(),
                      name: z.string()
                    })
                  })
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
      '/api/v1/app/{name}': {
        get: {
          summary: 'Get application by name',
          description: 'Retrieve application details by application name',
          parameters: [
            {
              name: 'name',
              in: 'path',
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
                    data: LaunchpadApplicationSchema
                  })
                }
              }
            },
            '400': {
              description: 'Invalid path parameters',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            },
            '404': {
              description: 'Application not found',
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
        },
        patch: {
          summary: 'Update application resources',
          description: 'Partially update application resources like CPU, memory, replicas, etc.',
          parameters: [
            {
              name: 'name',
              in: 'path',
              description: 'Application name',
              required: true,
              schema: {
                type: 'string'
              }
            }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: UpdateAppResourcesSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Application updated successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    data: GetAppByAppNameResponseSchema
                  })
                }
              }
            },
            '400': {
              description: 'Invalid request body or path parameters',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            },
            '404': {
              description: 'Application not found',
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
        },
        delete: {
          summary: 'Delete application',
          description: 'Delete an application by its name',
          parameters: [
            {
              name: 'name',
              in: 'path',
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
              description: 'Invalid path parameters',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            },
            '404': {
              description: 'Application not found',
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
      '/api/v1/app/startApp': {
        get: {
          summary: 'Start application',
          description: 'Start a paused application by restoring its replicas and HPA configuration',
          parameters: [
            {
              name: 'name',
              in: 'query',
              description: 'Name of the application to start',
              required: true,
              schema: {
                type: 'string'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Application started successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    message: z.string()
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
      '/api/v1/app/pauseApp': {
        get: {
          summary: 'Pause application',
          description:
            'Pause an application by setting replicas to 0 and storing current configuration',
          parameters: [
            {
              name: 'name',
              in: 'query',
              description: 'Name of the application to pause',
              required: true,
              schema: {
                type: 'string'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Application paused successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    message: z.string()
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

      '/api/v1/pod/getAppPodsByAppName': {
        get: {
          summary: 'Get application pods',
          description: 'Retrieve all pods for a specific application by name',
          parameters: [
            {
              name: 'name',
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
              description: 'Pods retrieved successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    data: GetAppPodsByAppNameResponseSchema
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
      '/api/v1/pod/getPodsMetrics': {
        post: {
          summary: 'Get pods metrics',
          description: 'Retrieve metrics data for pods by providing pod names',
          requestBody: {
            content: {
              'application/json': {
                schema: z.object({
                  podsName: z.array(z.string())
                })
              }
            }
          },
          responses: {
            '200': {
              description: 'Pods metrics retrieved successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    data: z.any()
                  })
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
