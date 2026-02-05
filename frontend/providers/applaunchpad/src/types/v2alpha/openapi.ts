import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import { LaunchpadApplicationSchema } from '@/types/v2alpha/schema';
import { CreateLaunchpadRequestSchema, UpdateAppResourcesSchema } from './request_schema';

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.string().optional(),
  error: z.string().optional()
});

// Get sealos domain from global config or use default
const getSealosDomain = () => {
  try {
    if (typeof global !== 'undefined' && global.AppConfig?.cloud?.domain) {
      return global.AppConfig.cloud.domain;
    }
  } catch (error) {
    // Ignore error
  }
  return 'cloud.sealos.io';
};

// generate openapi document for v2alpha
export const document = createDocument({
  openapi: '3.0.0',
  info: {
    title: 'Application Launch Pad API v2alpha',
    version: '2.0.0-alpha',
    description: 'API documentation for Application Launch Pad service v2alpha'
  },
  servers: [
    {
      url: `http://localhost:3000/api/v2alpha`,
      description: 'Development'
    },
    {
      url: `https://applaunchpad./api/v2alpha`,
      description: 'Production'
    }
  ],
  tags: [
    {
      name: 'Query',
      description:
        'Query operations for retrieving data. All query endpoints return 200 OK on success with data in the response body, and appropriate error codes (4xx, 5xx) on failure.'
    },
    {
      name: 'Mutation',
      description:
        'Mutation operations for creating, updating, or deleting data. All mutation endpoints return 204 No Content on success with no response body, and appropriate error codes (4xx, 5xx) with error details on failure.'
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
    '/app': {
      post: {
        tags: ['Mutation'],
        summary: 'Create a new application',
        description:
          'Creates a new containerized application with specified quota, networking, storage, and environment configurations.\n\n' +
          'Key points:\n' +
          '- Quota: Use quota.replicas (1-20) for fixed replicas, or quota.hpa for auto-scaling (cannot use both). CPU and memory must be in range [0.1, 32]\n' +
          '- Image: Set image.imageRegistry to null for public images, or provide credentials for private images\n' +
          '- Ports: http/grpc/ws protocols support public domain, tcp/udp/sctp use NodePort\n' +
          '- Storage: Providing storage creates a StatefulSet instead of Deployment',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: CreateLaunchpadRequestSchema
            }
          }
        },
        responses: {
          '204': {
            description: 'Application created successfully'
          },
          '400': {
            description: 'Bad Request - Invalid request body or parameters',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  invalidSchema: {
                    summary: 'Invalid schema validation',
                    value: {
                      code: 400,
                      message: 'Validation failed',
                      error: 'CPU must be in range [0.1, 32]'
                    }
                  },
                  duplicateName: {
                    summary: 'Duplicate application name',
                    value: {
                      code: 400,
                      message: 'Application name already exists',
                      error: 'An application with this name is already running'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Missing or invalid kubeconfig',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: {
                      code: 401,
                      message: 'Authentication required',
                      error: 'No kubeconfig provided in Authorization header'
                    }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  insufficientPermissions: {
                    summary: 'Insufficient permissions',
                    value: {
                      code: 403,
                      message: 'Forbidden',
                      error: 'User does not have permission to create deployments in this namespace'
                    }
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict - Resource already exists',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  resourceConflict: {
                    summary: 'Resource conflict',
                    value: {
                      code: 409,
                      message: 'Resource conflict',
                      error: 'Application with this name already exists'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  kubernetesError: {
                    summary: 'Kubernetes API error',
                    value: {
                      code: 500,
                      message: 'Failed to create application',
                      error: 'Kubernetes API returned an error: connection timeout'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/app/{name}': {
      get: {
        tags: ['Query'],
        summary: 'Get application details by name',
        description:
          'Retrieves complete application configuration and status including quota, networking, environment, storage, and runtime status.\n\n' +
          "Returns: metadata (name, uid, createdAt, upTime, resourceType='launchpad', kind), image config, quota (CPU/memory/replicas/HPA), ports (with privateAddress/publicAddress), env vars, ConfigMap, storage, and status enum (running/creating/waiting/error/pause).",
        parameters: [
          {
            name: 'name',
            in: 'path',
            description: 'Unique application name identifier',
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
                schema: LaunchpadApplicationSchema,
                examples: {
                  deploymentApp: {
                    summary: 'Deployment with fixed replicas',
                    value: {
                      name: 'web-api',
                      resourceType: 'launchpad',
                      kind: 'deployment',
                      image: {
                        imageName: 'nginx:1.21',
                        imageRegistry: null
                      },
                      quota: {
                        cpu: 1.5,
                        memory: 3.0,
                        replicas: 3
                      },
                      ports: [
                        {
                          number: 80,
                          portName: 'abcdef123456',
                          protocol: 'http',
                          privateAddress: 'http://web-api.ns-user123:80',
                          publicAddress: 'https://xyz789abc123.cloud.sealos.io',
                          customDomain: ''
                        }
                      ],
                      uid: 'app-12345',
                      createdAt: '2024-01-01T00:00:00Z',
                      upTime: '2h15m',
                      status: 'running'
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid path parameters',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  invalidName: {
                    summary: 'Invalid application name format',
                    value: {
                      code: 400,
                      message: 'Invalid path parameter',
                      error: 'Application name cannot be empty'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Missing or invalid kubeconfig',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '404': {
            description: 'Not Found - Application not found',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  notFound: {
                    summary: 'Application not found',
                    value: {
                      code: 404,
                      message: 'Application not found',
                      error: 'No application with name "web-api" exists in this namespace'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  kubernetesError: {
                    summary: 'Kubernetes API error',
                    value: {
                      code: 500,
                      message: 'Failed to retrieve application',
                      error: 'Unable to communicate with Kubernetes API'
                    }
                  }
                }
              }
            }
          }
        }
      },
      patch: {
        tags: ['Mutation'],
        summary: 'Update application configuration',
        description:
          'Partially updates application configuration. Supports quota, image, ports, env, storage, and ConfigMap.\n\n' +
          'Key points:\n' +
          '- Quota: Switch between fixed replicas and HPA by providing one and omitting the other. CPU and memory must be in range [0.1, 32]\n' +
          '- Image: Change image or switch public/private (set imageRegistry to null for public)\n' +
          '- Ports: Complete replacement - include portName to update, omit to create, missing ports are deleted, use [] to remove all\n' +
          '- ConfigMap: Complete replacement - provide all entries to keep, use [] to remove all, omit to keep unchanged. ConfigMap updates are handled through this unified endpoint (no separate /configmap endpoint)\n' +
          '- Storage: Complete replacement - provide all entries to keep, use [] to remove all, omit to keep unchanged\n' +
          '- Storage updates only supported for StatefulSet, trigger rolling restart\n' +
          '- All changes applied atomically',
        parameters: [
          {
            name: 'name',
            in: 'path',
            description: 'Application name identifier',
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
              schema: UpdateAppResourcesSchema
            }
          }
        },
        responses: {
          '204': {
            description: 'Application updated successfully'
          },
          '400': {
            description:
              'Bad Request - Invalid request body, unsupported operation, or port conflicts',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  invalidSchema: {
                    summary: 'Schema validation failed',
                    value: {
                      code: 400,
                      message: 'Invalid request body',
                      error: 'CPU must be in range [0.1, 32]'
                    }
                  },
                  unsupportedOperation: {
                    summary: 'Unsupported operation',
                    value: {
                      code: 400,
                      message: 'Unsupported operation',
                      error:
                        'Cannot update storage on Deployment. Storage updates are only supported for StatefulSet applications.'
                    }
                  },
                  duplicatePorts: {
                    summary: 'Duplicate port numbers',
                    value: {
                      code: 400,
                      message: 'Port conflict',
                      error: 'Duplicate port number 80 found in ports array'
                    }
                  },
                  emptyUpdate: {
                    summary: 'No fields provided',
                    value: {
                      code: 400,
                      message: 'Validation failed',
                      error: 'At least one field must be provided for update'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Missing or invalid kubeconfig',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '404': {
            description: 'Not Found - Application or port not found',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  appNotFound: {
                    summary: 'Application not found',
                    value: {
                      code: 404,
                      message: 'Application not found',
                      error: 'No application with name "web-api" exists'
                    }
                  },
                  portNotFound: {
                    summary: 'Port not found for update',
                    value: {
                      code: 404,
                      message: 'Port not found',
                      error: 'Port with portName "abc123" not found in application configuration'
                    }
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict - Update conflicts with current state',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  resourceConflict: {
                    summary: 'Resource conflict',
                    value: {
                      code: 409,
                      message: 'Resource conflict',
                      error: 'Application is currently being updated by another operation'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Unexpected error during update',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  updateFailed: {
                    summary: 'Update operation failed',
                    value: {
                      code: 500,
                      message: 'Failed to update application',
                      error: 'Kubernetes API error: unable to patch deployment'
                    }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Mutation'],
        summary: 'Delete application',
        description:
          'Permanently deletes the application and all associated Kubernetes resources (deployments/statefulsets, services, ingresses, ConfigMaps, Secrets).\n\n' +
          'Pods terminated gracefully (30s grace period). For StatefulSet, PVCs are preserved by default. Operation is irreversible.',
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
          '204': {
            description: 'Application deleted successfully'
          },
          '400': {
            description: 'Bad Request - Invalid parameters',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  invalidName: {
                    summary: 'Invalid application name',
                    value: {
                      code: 400,
                      message: 'Invalid path parameter',
                      error: 'Application name cannot be empty'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Missing or invalid kubeconfig',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  insufficientPermissions: {
                    summary: 'Insufficient permissions',
                    value: {
                      code: 403,
                      message: 'Forbidden',
                      error: 'User does not have permission to delete deployments in this namespace'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Application not found',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  notFound: {
                    summary: 'Application not found',
                    value: {
                      code: 404,
                      message: 'Application not found',
                      error: 'No application with name "web-api" exists'
                    }
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict - Cannot delete in current state',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  deletionInProgress: {
                    summary: 'Deletion already in progress',
                    value: {
                      code: 409,
                      message: 'Conflict',
                      error: 'Application is already being deleted'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  deletionFailed: {
                    summary: 'Deletion failed',
                    value: {
                      code: 500,
                      message: 'Failed to delete application',
                      error: 'Kubernetes API error: unable to delete deployment'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/app/{name}/start': {
      post: {
        tags: ['Mutation'],
        summary: 'Start paused application',
        description:
          'Resumes a paused application by restoring replica count or HPA configuration from stored metadata.\n\n' +
          'Restores pods to handle traffic. Services/ingresses remain active. Typically takes 1-3 minutes to full availability. Idempotent operation.',
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
          '204': {
            description: 'Application started successfully'
          },
          '400': {
            description: 'Bad Request - Invalid parameters or application state',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  invalidName: {
                    summary: 'Invalid application name',
                    value: {
                      code: 400,
                      message: 'Invalid path parameter',
                      error: 'Application name cannot be empty'
                    }
                  },
                  alreadyRunning: {
                    summary: 'Application already running',
                    value: {
                      code: 400,
                      message: 'Invalid operation',
                      error: 'Application is already running'
                    }
                  },
                  missingMetadata: {
                    summary: 'Missing pause metadata',
                    value: {
                      code: 400,
                      message: 'Cannot start application',
                      error:
                        'No stored configuration found. Application may not have been properly paused.'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Missing or invalid kubeconfig',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '404': {
            description: 'Not Found - Application not found',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  notFound: {
                    summary: 'Application not found',
                    value: {
                      code: 404,
                      message: 'Application not found',
                      error: 'No application with name "web-api" exists'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  startFailed: {
                    summary: 'Start operation failed',
                    value: {
                      code: 500,
                      message: 'Failed to start application',
                      error: 'Unable to update deployment replicas'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/app/{name}/pause': {
      post: {
        tags: ['Mutation'],
        summary: 'Pause application',
        description:
          'Temporarily stops an application by scaling replicas to zero while preserving configuration.\n\n' +
          'Stores replica/HPA state in metadata, terminates pods gracefully (30s grace period). Services/ingresses remain but route no traffic. Storage preserved. Typical cost reduction: 60-80% (compute only). Idempotent operation.',
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
          '204': {
            description: 'Application paused successfully'
          },
          '400': {
            description: 'Bad Request - Invalid parameters or application state',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  invalidName: {
                    summary: 'Invalid application name',
                    value: {
                      code: 400,
                      message: 'Invalid path parameter',
                      error: 'Application name cannot be empty'
                    }
                  },
                  alreadyPaused: {
                    summary: 'Application already paused',
                    value: {
                      code: 400,
                      message: 'Invalid operation',
                      error: 'Application is already paused (replicas = 0)'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Missing or invalid kubeconfig',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '404': {
            description: 'Not Found - Application not found',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  notFound: {
                    summary: 'Application not found',
                    value: {
                      code: 404,
                      message: 'Application not found',
                      error: 'No application with name "web-api" exists'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  pauseFailed: {
                    summary: 'Pause operation failed',
                    value: {
                      code: 500,
                      message: 'Failed to pause application',
                      error: 'Unable to update deployment annotations or scale replicas'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/app/{name}/restart': {
      post: {
        tags: ['Mutation'],
        summary: 'Restart application',
        description:
          'Performs a rolling restart of all application pods while maintaining service availability.\n\n' +
          'Updates pod template annotation to trigger rolling update. Zero-downtime for multiple replicas, 30-90s downtime for single replica. Duration: 30-90s (single) to 2-5min (multiple). Does NOT update configuration (use PATCH for config changes).',
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
          '204': {
            description: 'Application restart initiated successfully'
          },
          '400': {
            description: 'Bad Request - Invalid parameters',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  invalidName: {
                    summary: 'Invalid application name',
                    value: {
                      code: 400,
                      message: 'Invalid path parameter',
                      error: 'Application name cannot be empty'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Missing or invalid kubeconfig',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '404': {
            description: 'Not Found - Application not found',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  notFound: {
                    summary: 'Application not found',
                    value: {
                      code: 404,
                      message: 'Application not found',
                      error: 'No application with name "web-api" exists'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  restartFailed: {
                    summary: 'Restart operation failed',
                    value: {
                      code: 500,
                      message: 'Failed to restart application',
                      error: 'Unable to update pod template annotations'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
});
