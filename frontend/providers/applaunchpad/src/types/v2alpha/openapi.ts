import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import { LaunchpadApplicationSchema } from '@/types/v2alpha/schema';
import { CreateLaunchpadRequestSchema, UpdateAppResourcesSchema } from './request_schema';
import { ErrorResponseSchema, ErrorType, ErrorCode, createErrorExample } from './error';

// Re-export for backward compatibility
export { ErrorType, ErrorCode, ErrorResponseSchema, createErrorExample } from './error';
export type { ErrorTypeValue, ErrorCodeType } from './error';

// Get production server URL from current environment
const getProductionServerUrl = () => {
  try {
    // Client-side: use window.location.origin directly
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/api/v2alpha`;
    }
    // Server-side: construct from global.AppConfig
    if (typeof global !== 'undefined' && global.AppConfig?.cloud?.domain) {
      return `https://applaunchpad.${global.AppConfig.cloud.domain}/api/v2alpha`;
    }
  } catch (error) {
    // Ignore error
  }
  return 'https://applaunchpad.cloud.sealos.io/api/v2alpha';
};

// Factory function to create openapi document with dynamic URL
export const createOpenApiDocument = () => {
  return createDocument({
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
        url: getProductionServerUrl(),
        description: 'Production'
      },
      {
        url: `https://applaunchpad.192.168.12.53.nip.io/api/v2alpha`,
        description: 'Development'
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
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_VALUE,
                        'Invalid request body. Please check the application configuration format.'
                      )
                    },
                    duplicateName: {
                      summary: 'Duplicate application name',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.ALREADY_EXISTS,
                        'An application with this name already exists in the current namespace.'
                      )
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
                      value: createErrorExample(
                        ErrorType.AUTHENTICATION_ERROR,
                        ErrorCode.AUTHENTICATION_REQUIRED,
                        'Authentication required. Please provide valid credentials in the Authorization header.'
                      )
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
                      value: createErrorExample(
                        ErrorType.AUTHORIZATION_ERROR,
                        ErrorCode.PERMISSION_DENIED,
                        'Insufficient permissions to perform this operation. Please check your access rights.'
                      )
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
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.CONFLICT,
                        'A resource with this configuration already exists and conflicts with the request.'
                      )
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
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to create application. The Kubernetes operation encountered an error.',
                        'namespaces "ns-xxx" not found'
                      )
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
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.'
                      )
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
                      value: createErrorExample(
                        ErrorType.AUTHENTICATION_ERROR,
                        ErrorCode.AUTHENTICATION_REQUIRED,
                        'Authentication required. Please provide valid credentials in the Authorization header.'
                      )
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
                      value: createErrorExample(
                        ErrorType.AUTHORIZATION_ERROR,
                        ErrorCode.PERMISSION_DENIED,
                        'Insufficient permissions to perform this operation. Please check your access rights.'
                      )
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
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application not found in the current namespace. Please verify the application name.'
                      )
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
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to retrieve application. The Kubernetes operation encountered an error.',
                        'deployments.apps "web-api" not found'
                      )
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
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_VALUE,
                        'Invalid request body. Please check the application configuration format.'
                      )
                    },
                    unsupportedOperation: {
                      summary: 'Unsupported operation',
                      value: createErrorExample(
                        ErrorType.CLIENT_ERROR,
                        ErrorCode.UNSUPPORTED_OPERATION,
                        'This operation is not supported for the current application state.'
                      )
                    },
                    duplicatePorts: {
                      summary: 'Duplicate port numbers',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.CONFLICT,
                        'Port conflict detected. Duplicate port numbers are not allowed.'
                      )
                    },
                    emptyUpdate: {
                      summary: 'No fields provided',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_VALUE,
                        'Request body validation failed. Please check the update configuration format.'
                      )
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
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application not found in the current namespace. Please verify the application name.'
                      )
                    },
                    portNotFound: {
                      summary: 'Port not found for update',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Port not found in the application configuration.'
                      )
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
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.CONFLICT,
                        'A resource with this configuration already exists and conflicts with the request.'
                      )
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
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to update application. The Kubernetes operation encountered an error.',
                        'Operation cannot be fulfilled on deployments.apps "web-api": the object has been modified'
                      )
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
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.'
                      )
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
                      value: createErrorExample(
                        ErrorType.AUTHORIZATION_ERROR,
                        ErrorCode.PERMISSION_DENIED,
                        'Insufficient permissions to perform this operation. Please check your access rights.'
                      )
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
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application not found in the current namespace. Please verify the application name.'
                      )
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
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        undefined,
                        'Conflict',
                        'Application is already being deleted'
                      )
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
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to delete application. The Kubernetes operation encountered an error.',
                        'deployments.apps "web-api" not found'
                      )
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
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.'
                      )
                    },
                    alreadyRunning: {
                      summary: 'Application already running',
                      value: createErrorExample(
                        ErrorType.CLIENT_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid operation. The application state does not allow this action.'
                      )
                    },
                    missingMetadata: {
                      summary: 'Missing pause metadata',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        undefined,
                        'Cannot start application',
                        'No stored configuration found. Application may not have been properly paused.'
                      )
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
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application not found in the current namespace. Please verify the application name.'
                      )
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
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to start application. The Kubernetes operation encountered an error.',
                        'deployments.apps "web-api" not found'
                      )
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
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.'
                      )
                    },
                    alreadyPaused: {
                      summary: 'Application already paused',
                      value: createErrorExample(
                        ErrorType.CLIENT_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid operation. The application state does not allow this action.'
                      )
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
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application not found in the current namespace. Please verify the application name.'
                      )
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
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to pause application. The Kubernetes operation encountered an error.',
                        'deployments.apps "web-api" not found'
                      )
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
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.'
                      )
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
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application not found in the current namespace. Please verify the application name.'
                      )
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
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to restart application. The Kubernetes operation encountered an error.',
                        'deployments.apps "web-api" not found'
                      )
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
};

// For backward compatibility - creates document with auto-detected domain
// Note: Prefer using createOpenApiDocument() directly for dynamic domain support
export const document = createOpenApiDocument();
