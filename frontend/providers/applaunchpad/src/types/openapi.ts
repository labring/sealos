import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import { LaunchpadApplicationSchema } from '@/types/schema';
import {
  CreateLaunchpadRequestSchema,
  DeleteAppByNameResponseSchema,
  GetAppByAppNameResponseSchema,
  UpdateAppResourcesSchema,
  UpdateConfigMapSchema,
  CreatePortsSchema,
  UpdatePortsSchema,
  DeletePortsSchema,
  UpdateStorageSchema
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
      '/api/v1/app/{name}/configmap': {
        patch: {
          summary: 'Update application ConfigMap',
          description:
            'Update application ConfigMap configuration and synchronize volumes and volumeMounts in Deployment/StatefulSet. ' +
            'This API uses Strategic Merge Patch to safely update only the specified ConfigMap fields without affecting other volumes or volumeMounts. ' +
            'The ConfigMap will be created if it does not exist, or updated if it already exists.',
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
            required: true,
            content: {
              'application/json': {
                schema: UpdateConfigMapSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'ConfigMap updated successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    data: LaunchpadApplicationSchema
                  })
                }
              }
            },
            '400': {
              description: 'Invalid request parameters or application structure',
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
              description: 'Internal server error during ConfigMap update',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/app/{name}/ports': {
        post: {
          summary: 'Create new application ports',
          description:
            'Add new port configurations to an application including container ports, services, and ingresses. ' +
            'This API creates entirely new ports that do not already exist in the application. ' +
            'Port conflicts will be rejected.',
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
            required: true,
            content: {
              'application/json': {
                schema: CreatePortsSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Ports created successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    data: LaunchpadApplicationSchema
                  })
                }
              }
            },
            '400': {
              description: 'Invalid request parameters, duplicate ports, or ports already exist',
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
              description: 'Internal server error during ports creation',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            }
          }
        },
        patch: {
          summary: 'Update existing application ports',
          description:
            'Update existing application port configurations including container ports, services, and ingresses. ' +
            'This API requires at least one identifier (networkName, portName, or serviceName) to locate the port to update. ' +
            'Only specified ports will be updated, existing ports not mentioned will remain unchanged.',
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
            required: true,
            content: {
              'application/json': {
                schema: UpdatePortsSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Ports updated successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    data: LaunchpadApplicationSchema
                  })
                }
              }
            },
            '400': {
              description: 'Invalid request parameters, missing identifiers, or port not found',
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
              description: 'Internal server error during ports update',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            }
          }
        },
        delete: {
          summary: 'Delete application ports',
          description:
            'Delete specified application ports by port number. ' +
            'This API removes the specified ports from container configuration, services, and ingresses. ' +
            'At least one port number must be provided.',
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
            required: true,
            content: {
              'application/json': {
                schema: DeletePortsSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Ports deleted successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    data: LaunchpadApplicationSchema
                  })
                }
              }
            },
            '400': {
              description: 'Invalid request parameters or application structure',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            },
            '404': {
              description: 'Application not found or no matching ports found to delete',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error during ports deletion',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/app/{name}/storage': {
        patch: {
          summary: 'Update application storage',
          description:
            'Incrementally update application persistent storage configuration for StatefulSet applications. ' +
            'This API manages PVC (Persistent Volume Claims) and volumeClaimTemplates in the StatefulSet. ' +
            'It supports PVC expansion but prevents shrinking due to Kubernetes limitations. ' +
            'Only specified storage configurations are updated/added, existing storage not listed will be preserved. ' +
            'Storage names are auto-generated from paths using mountPathToConfigMapKey function. ' +
            'StatefulSet will be deleted and recreated due to volumeClaimTemplates immutability.',
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
            required: true,
            content: {
              'application/json': {
                schema: UpdateStorageSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Storage updated successfully',
              content: {
                'application/json': {
                  schema: z.object({
                    data: LaunchpadApplicationSchema
                  })
                }
              }
            },
            '400': {
              description:
                'Invalid request parameters, duplicate paths, or unsupported application type (only StatefulSet supported)',
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
              description: 'Internal server error during storage update or PVC expansion',
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
