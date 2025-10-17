import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import { LaunchpadApplicationSchema } from '@/types/schema';
import {
  CreateLaunchpadRequestSchema,
  DeleteAppByNameResponseSchema,
  GetAppByAppNameResponseSchema,
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
          description:
            'Create a new application with standardized configuration format. ' +
            'Supports both fixed replicas and elastic scaling (HPA): ' +
            '- For fixed instances: Use resource.replicas only ' +
            '- For elastic scaling: Use resource.hpa configuration ' +
            'Image configuration supports both public and private registries: ' +
            '- For public images: Set image.imageRegistry to null ' +
            '- For private images: Provide image.imageRegistry with credentials',
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
                    data: LaunchpadApplicationSchema
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
          summary: 'Update application configuration',
          description:
            'Partially update application configuration including resources, ConfigMap, storage, and ports. ' +
            'This unified endpoint handles all types of application updates: ' +
            '- Resource updates (CPU, memory, replicas, HPA, etc.) ' +
            '  * For fixed instances: Update resource.replicas ' +
            '  * For elastic scaling: Update resource.hpa ' +
            '  * Can switch between fixed and elastic modes ' +
            '- Image configuration (imageName and registry authentication) ' +
            '  * For public images: Set image.imageRegistry to null ' +
            '  * For private images: Provide image.imageRegistry with credentials ' +
            '- Launch command configuration (command and args) ' +
            '- Environment variables ' +
            '- ConfigMap configuration (replaces existing ConfigMap entirely) ' +
            '- Storage configuration (incremental updates for StatefulSet only) ' +
            '- Port configuration (create/update ports) ' +
            '  * For new ports: Omit identifiers (networkName, portName, serviceName) ' +
            '  * For updates: Include at least one identifier to locate existing port ' +
            '- Port deletion via deletePorts field ' +
            'At least one field must be provided for the update.',
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
              description:
                'Invalid request body, path parameters, unsupported operation (e.g., storage update on Deployment), duplicate ports, or port conflicts',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            },
            '404': {
              description: 'Application not found or ports not found for update/deletion',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error during application update',
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
      '/api/v1/app/{name}/start': {
        post: {
          summary: 'Start application',
          description: 'Start a paused application by restoring its replicas and HPA configuration',
          parameters: [
            {
              name: 'name',
              in: 'path',
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
      '/api/v1/app/{name}/pause': {
        post: {
          summary: 'Pause application',
          description:
            'Pause an application by setting replicas to 0 and storing current configuration',
          parameters: [
            {
              name: 'name',
              in: 'path',
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
      '/api/v1/app/{name}/restart': {
        post: {
          summary: 'Restart application',
          description:
            'Restart an application by updating the restartTime label to trigger pod recreation',
          parameters: [
            {
              name: 'name',
              in: 'path',
              description: 'Name of the application to restart',
              required: true,
              schema: {
                type: 'string'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Application restarted successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    message: z.string()
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
        }
      }
    }
  });
