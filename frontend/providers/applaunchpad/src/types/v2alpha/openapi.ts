import { createDocument } from 'zod-openapi';
import { LaunchpadApplicationSchema } from '@/types/v2alpha/schema';
import {
  CreateLaunchpadRequestSchema,
  UpdateAppResourcesSchema,
  UpdateStorageSchema
} from './request_schema';
import {
  ErrorType,
  ErrorCode,
  createErrorExample,
  createError400Schema,
  createError401Schema,
  createError403Schema,
  createError404Schema,
  createError405Schema,
  createError409Schema,
  createError422Schema,
  createError500Schema,
  createError503Schema
} from './error';

// Re-export for backward compatibility
export {
  ErrorType,
  ErrorCode,
  createErrorExample,
  createError400Schema,
  createError401Schema,
  createError403Schema,
  createError404Schema,
  createError405Schema,
  createError409Schema,
  createError422Schema,
  createError500Schema,
  createError503Schema
} from './error';
export { ErrorResponseSchema } from './error';
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
      '/apps': {
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
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER], 'create app'),
                  examples: {
                    invalidParameter: {
                      summary: 'Request body validation failed',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Request body validation failed. Please check the application configuration format.',
                        [{ field: 'image.imageName', message: 'Required' }]
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
                  schema: createError401Schema(),
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
                  schema: createError403Schema([ErrorCode.PERMISSION_DENIED], 'create app'),
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
              description: 'Conflict - Application already exists',
              content: {
                'application/json': {
                  schema: createError409Schema([ErrorCode.ALREADY_EXISTS]),
                  examples: {
                    alreadyExists: {
                      summary: 'Application already exists',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.ALREADY_EXISTS,
                        'An application with this name already exists in the current namespace. Use a different name.'
                      )
                    }
                  }
                }
              }
            },
            '422': {
              description:
                'Unprocessable Entity - Resource spec rejected by cluster (admission webhook, invalid field, quota exceeded)',
              content: {
                'application/json': {
                  schema: createError422Schema('create app'),
                  examples: {
                    invalidResourceSpec: {
                      summary: 'Resource spec rejected',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.INVALID_RESOURCE_SPEC,
                        'The resource specification was rejected by the cluster. Check admission webhooks, field constraints, and quota limits.',
                        'admission webhook "vingress.sealos.io" denied the request: cannot verify host'
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
                  schema: createError500Schema([
                    ErrorCode.KUBERNETES_ERROR,
                    ErrorCode.OPERATION_FAILED,
                    ErrorCode.INTERNAL_ERROR
                  ]),
                  examples: {
                    kubernetesError: {
                      summary: 'Kubernetes API error',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to create application in Kubernetes cluster. Please check cluster status and permissions.',
                        'namespaces "ns-xxx" not found'
                      )
                    },
                    initFailure: {
                      summary: 'Kubernetes context initialization failed',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to initialize Kubernetes context. Please check your configuration and try again.',
                        'invalid kubeconfig format'
                      )
                    },
                    unexpectedError: {
                      summary: 'Unexpected server error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'An unexpected internal error occurred while processing your request. Please try again or contact support if the issue persists.',
                        'TypeError: Cannot read properties of undefined'
                      )
                    }
                  }
                }
              }
            },
            '503': {
              description: 'Service Unavailable - Kubernetes cluster temporarily unreachable',
              content: {
                'application/json': {
                  schema: createError503Schema('create app'),
                  examples: {
                    serviceUnavailable: {
                      summary: 'Cluster unreachable',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.SERVICE_UNAVAILABLE,
                        'Kubernetes cluster is temporarily unavailable. Please try again later.',
                        'connect ECONNREFUSED 10.0.0.1:6443'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/apps/{name}': {
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
              description:
                'Application name (Kubernetes resource name, must be a valid DNS subdomain: lowercase alphanumeric, hyphens)',
              required: true,
              schema: {
                type: 'string',
                minLength: 1,
                example: 'web-api'
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
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER], 'get app'),
                  examples: {
                    invalidName: {
                      summary: 'Invalid application name format',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.',
                        [{ field: 'name', message: 'name cannot be empty' }]
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
                  schema: createError401Schema(),
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
                  schema: createError403Schema([ErrorCode.PERMISSION_DENIED], 'get app'),
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
              description: 'Not Found - Application not found in the current namespace',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Application not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application "web-api" not found in the current namespace. Please verify the application name.'
                      )
                    }
                  }
                }
              }
            },
            '405': {
              description: 'Method Not Allowed - HTTP method not supported for this endpoint',
              content: {
                'application/json': {
                  schema: createError405Schema(),
                  examples: {
                    methodNotAllowed: {
                      summary: 'Wrong HTTP method',
                      value: createErrorExample(
                        ErrorType.CLIENT_ERROR,
                        ErrorCode.METHOD_NOT_ALLOWED,
                        'HTTP method POST is not supported for this endpoint. Allowed methods: GET, DELETE, PATCH.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal Server Error - Kubernetes API error or unexpected failure',
              content: {
                'application/json': {
                  schema: createError500Schema([
                    ErrorCode.KUBERNETES_ERROR,
                    ErrorCode.OPERATION_FAILED,
                    ErrorCode.INTERNAL_ERROR
                  ]),
                  examples: {
                    kubernetesError: {
                      summary: 'Kubernetes API error',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to retrieve application "web-api". The Kubernetes operation encountered an error.',
                        'deployments.apps "web-api" not found'
                      )
                    },
                    initFailure: {
                      summary: 'Kubernetes context initialization failed',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to initialize Kubernetes context. Please check your configuration and try again.',
                        'invalid kubeconfig format'
                      )
                    },
                    unexpectedError: {
                      summary: 'Unexpected server error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'An unexpected error occurred while processing your request. Please try again or contact support.',
                        'TypeError: Cannot read properties of undefined'
                      )
                    }
                  }
                }
              }
            },
            '503': {
              description: 'Service Unavailable - Kubernetes cluster temporarily unreachable',
              content: {
                'application/json': {
                  schema: createError503Schema(),
                  examples: {
                    clusterUnavailable: {
                      summary: 'Cluster unreachable',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.SERVICE_UNAVAILABLE,
                        'Kubernetes cluster is temporarily unavailable. Please try again later.',
                        'connect ECONNREFUSED 10.0.0.1:6443'
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
              description: 'Bad Request - Invalid request body or port validation error',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER], 'patch app'),
                  examples: {
                    validationFailed: {
                      summary: 'Request body validation failed',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Request body validation failed. Please check the update configuration format.',
                        [
                          {
                            field: 'quota',
                            message:
                              'Must specify either replicas (for fixed instances) or hpa (for elastic scaling), but not both.'
                          }
                        ]
                      )
                    },
                    portNumberRequired: {
                      summary: 'Port number required for creating new ports',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Port number is required for creating new ports',
                        { portConfig: {}, operation: 'CREATE_PORT_VALIDATION' }
                      )
                    },
                    isPublicNonAppProtocol: {
                      summary: 'Cannot set isPublic for non-application protocol',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Cannot set isPublic for non-application protocol. Current protocol: TCP',
                        {
                          currentProtocol: 'TCP',
                          supportedProtocols: ['HTTP', 'GRPC', 'WS'],
                          operation: 'UPDATE_PUBLIC_DOMAIN'
                        }
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
                  schema: createError401Schema(),
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
                  schema: createError403Schema([ErrorCode.PERMISSION_DENIED], 'patch app'),
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
              description: 'Not Found - Application not found or port not found',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    appNotFound: {
                      summary: 'Application not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application "web-api" not found in the current namespace. Please verify the application name.'
                      )
                    },
                    portNotFound: {
                      summary: 'Port not found by portName',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Port "nonexistent-port-id" not found in application "web-api". Verify the portName or omit it to create a new port.',
                        { portName: 'nonexistent-port-id', operation: 'UPDATE_PORT_NOT_FOUND' }
                      )
                    }
                  }
                }
              }
            },
            '409': {
              description: 'Conflict - Port conflict',
              content: {
                'application/json': {
                  schema: createError409Schema([ErrorCode.CONFLICT]),
                  examples: {
                    portUpdateConflict: {
                      summary: 'Port update conflicts with existing port',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.CONFLICT,
                        'Cannot update to port 8080: already in use by another port',
                        {
                          conflictingPortDetails: {
                            port: 8080,
                            portName: 'abcdef123456',
                            serviceName: 'web-api-8080-xyz-service'
                          },
                          requestedPort: 8080,
                          operation: 'UPDATE_PORT_CONFLICT'
                        }
                      )
                    },
                    portCreateConflict: {
                      summary: 'New port conflicts with existing port',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.CONFLICT,
                        'Cannot create port 80: already exists',
                        {
                          existingPortDetails: {
                            port: 80,
                            portName: 'abcdef123456',
                            serviceName: 'web-api-80-xyz-service'
                          },
                          operation: 'CREATE_PORT_CONFLICT'
                        }
                      )
                    },
                    portCreateDuplicate: {
                      summary: 'Duplicate port in same request',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.CONFLICT,
                        'Cannot create duplicate port 80',
                        { operation: 'CREATE_PORT_DUPLICATE' }
                      )
                    }
                  }
                }
              }
            },
            '422': {
              description:
                'Unprocessable Entity - Resource spec rejected by cluster (admission webhook, invalid field, quota exceeded)',
              content: {
                'application/json': {
                  schema: createError422Schema('patch app'),
                  examples: {
                    invalidResourceSpec: {
                      summary: 'Resource spec rejected',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.INVALID_RESOURCE_SPEC,
                        'The resource specification was rejected by the cluster. Check admission webhooks, field constraints, and quota limits.',
                        'admission webhook "vingress.sealos.io" denied the request: cannot verify host'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description:
                'Internal Server Error - Kubernetes operation error or unexpected failure',
              content: {
                'application/json': {
                  schema: createError500Schema([
                    ErrorCode.KUBERNETES_ERROR,
                    ErrorCode.OPERATION_FAILED,
                    ErrorCode.INTERNAL_ERROR
                  ]),
                  examples: {
                    kubernetesError: {
                      summary: 'Kubernetes operation failed',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to update application "web-api". The Kubernetes operation encountered an error.',
                        'Operation cannot be fulfilled on deployments.apps "web-api": the object has been modified'
                      )
                    },
                    initFailure: {
                      summary: 'Kubernetes context initialization failed',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to initialize Kubernetes context. Please check your configuration and try again.',
                        'invalid kubeconfig format'
                      )
                    },
                    unexpectedError: {
                      summary: 'Unexpected server error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'An unexpected error occurred while processing your request. Please try again or contact support.',
                        'TypeError: Cannot read properties of undefined'
                      )
                    }
                  }
                }
              }
            },
            '503': {
              description: 'Service Unavailable - Kubernetes cluster temporarily unreachable',
              content: {
                'application/json': {
                  schema: createError503Schema('patch app'),
                  examples: {
                    clusterUnavailable: {
                      summary: 'Cluster unreachable',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.SERVICE_UNAVAILABLE,
                        'Kubernetes cluster is temporarily unavailable. Please try again later.',
                        'connect ECONNREFUSED 10.0.0.1:6443'
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
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER], 'delete'),
                  examples: {
                    invalidName: {
                      summary: 'Invalid application name',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.',
                        [{ field: 'name', message: 'name cannot be empty' }]
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
                  schema: createError401Schema(),
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
                  schema: createError403Schema([ErrorCode.PERMISSION_DENIED], 'delete'),
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
              description: 'Not Found - Application not found in the current namespace',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Application not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application "web-api" not found in the current namespace. Please verify the application name.'
                      )
                    }
                  }
                }
              }
            },
            '422': {
              description: 'Unprocessable Entity - Resource spec rejected by cluster',
              content: {
                'application/json': {
                  schema: createError422Schema('delete'),
                  examples: {
                    invalidResourceSpec: {
                      summary: 'Resource spec rejected',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.INVALID_RESOURCE_SPEC,
                        'The resource specification was rejected by the cluster. Check admission webhooks, field constraints, and quota limits.',
                        'admission webhook denied the request'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description:
                'Internal Server Error - Kubernetes operation error or unexpected failure',
              content: {
                'application/json': {
                  schema: createError500Schema([
                    ErrorCode.KUBERNETES_ERROR,
                    ErrorCode.OPERATION_FAILED,
                    ErrorCode.INTERNAL_ERROR
                  ]),
                  examples: {
                    kubernetesError: {
                      summary: 'Kubernetes delete failed',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to delete application "web-api". The Kubernetes operation encountered an error.',
                        'Failed to delete some resources for application "web-api". Errors in: [Deployment, StatefulSet]. First error: deployments.apps "web-api" not found'
                      )
                    },
                    initFailure: {
                      summary: 'Kubernetes context initialization failed',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to initialize Kubernetes context. Please check your configuration and try again.',
                        'invalid kubeconfig format'
                      )
                    },
                    unexpectedError: {
                      summary: 'Unexpected server error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'An unexpected error occurred while processing your request. Please try again or contact support.',
                        'TypeError: Cannot read properties of undefined'
                      )
                    }
                  }
                }
              }
            },
            '503': {
              description: 'Service Unavailable - Kubernetes cluster temporarily unreachable',
              content: {
                'application/json': {
                  schema: createError503Schema('delete'),
                  examples: {
                    clusterUnavailable: {
                      summary: 'Cluster unreachable',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.SERVICE_UNAVAILABLE,
                        'Kubernetes cluster is temporarily unavailable. Please try again later.',
                        'connect ECONNREFUSED 10.0.0.1:6443'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/apps/{name}/start': {
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
              description: 'Bad Request - Invalid parameters',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER], 'start'),
                  examples: {
                    invalidName: {
                      summary: 'Invalid application name',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.',
                        [{ field: 'name', message: 'name cannot be empty' }]
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
                  schema: createError401Schema(),
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
                  schema: createError403Schema([
                    ErrorCode.PERMISSION_DENIED,
                    ErrorCode.INSUFFICIENT_BALANCE
                  ]),
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
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Application not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application "web-api" not found in the current namespace. Please verify the application name.'
                      )
                    }
                  }
                }
              }
            },
            '409': {
              description: 'Conflict - Application already running',
              content: {
                'application/json': {
                  schema: createError409Schema([ErrorCode.CONFLICT], 'start'),
                  examples: {
                    alreadyRunning: {
                      summary: 'Application already running',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.CONFLICT,
                        'Application "web-api" is already running and does not need to be started.'
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
                  schema: createError500Schema([
                    ErrorCode.KUBERNETES_ERROR,
                    ErrorCode.OPERATION_FAILED,
                    ErrorCode.INTERNAL_ERROR
                  ]),
                  examples: {
                    startFailed: {
                      summary: 'Start operation failed',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to start application "web-api". The Kubernetes operation encountered an error.',
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
      '/apps/{name}/pause': {
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
              description: 'Bad Request - Invalid parameters',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER], 'pause'),
                  examples: {
                    invalidName: {
                      summary: 'Invalid application name',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.',
                        [{ field: 'name', message: 'name cannot be empty' }]
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
                  schema: createError401Schema(),
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
                  schema: createError403Schema([
                    ErrorCode.PERMISSION_DENIED,
                    ErrorCode.INSUFFICIENT_BALANCE
                  ]),
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
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Application not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application "web-api" not found in the current namespace. Please verify the application name.'
                      )
                    }
                  }
                }
              }
            },
            '409': {
              description: 'Conflict - Application already paused',
              content: {
                'application/json': {
                  schema: createError409Schema([ErrorCode.CONFLICT], 'pause'),
                  examples: {
                    alreadyPaused: {
                      summary: 'Application already paused',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.CONFLICT,
                        'Application "web-api" is already paused and does not need to be paused again.'
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
                  schema: createError500Schema([
                    ErrorCode.KUBERNETES_ERROR,
                    ErrorCode.OPERATION_FAILED,
                    ErrorCode.INTERNAL_ERROR
                  ]),
                  examples: {
                    pauseFailed: {
                      summary: 'Pause operation failed',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to pause application "web-api". The Kubernetes operation encountered an error.',
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
      '/apps/{name}/storage': {
        patch: {
          tags: ['Mutation'],
          summary: 'Update application storage (incremental)',
          description:
            'Incrementally updates storage configuration for a StatefulSet application.\n\n' +
            'Key points:\n' +
            '- Only StatefulSet applications are supported (Deployment returns 400)\n' +
            '- Incremental merge: only pass the volumes you want to add or resize — existing volumes not listed are preserved\n' +
            '- To remove a volume, use `PATCH /apps/{name}` with a complete storage replacement\n' +
            '- Storage can only be expanded, not shrunk (PVC limitation)\n' +
            '- Triggers StatefulSet recreation to apply changes',
          parameters: [
            {
              name: 'name',
              in: 'path',
              description: 'Name of the application',
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
                schema: UpdateStorageSchema,
                examples: {
                  expandVolume: {
                    summary: 'Expand an existing volume',
                    value: {
                      storage: [{ path: '/data', size: '20Gi' }]
                    }
                  },
                  addVolume: {
                    summary: 'Add a new volume',
                    value: {
                      storage: [{ path: '/logs', size: '5Gi' }]
                    }
                  }
                }
              }
            }
          },
          responses: {
            '204': {
              description: 'Storage updated successfully'
            },
            '400': {
              description: 'Bad Request - Invalid parameters or unsupported application type',
              content: {
                'application/json': {
                  schema: createError400Schema(
                    [ErrorCode.INVALID_PARAMETER, ErrorCode.STORAGE_REQUIRES_STATEFULSET],
                    'storage'
                  ),
                  examples: {
                    invalidName: {
                      summary: 'Invalid application name',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.'
                      )
                    },
                    notStatefulSet: {
                      summary: 'Application is not a StatefulSet',
                      value: createErrorExample(
                        ErrorType.CLIENT_ERROR,
                        ErrorCode.STORAGE_REQUIRES_STATEFULSET,
                        'Storage updates are only supported for StatefulSet applications. Application "web-api" is currently a deployment.',
                        'Convert your application to StatefulSet to enable storage management.'
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
                  schema: createError401Schema(),
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
                  schema: createError403Schema([
                    ErrorCode.PERMISSION_DENIED,
                    ErrorCode.INSUFFICIENT_BALANCE
                  ]),
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
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Application not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application "web-api" not found in the current namespace. Please verify the application name.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal Server Error - StatefulSet recreation or PVC update failed',
              content: {
                'application/json': {
                  schema: createError500Schema(
                    [
                      ErrorCode.KUBERNETES_ERROR,
                      ErrorCode.STORAGE_UPDATE_FAILED,
                      ErrorCode.OPERATION_FAILED,
                      ErrorCode.INTERNAL_ERROR
                    ],
                    'storage'
                  ),
                  examples: {
                    storageFailed: {
                      summary: 'Storage update failed',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.STORAGE_UPDATE_FAILED,
                        'Failed to update storage for application "web-api". The StatefulSet recreation or PVC update failed.',
                        'cannot shrink PVC from 10Gi to 5Gi'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/apps/{name}/restart': {
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
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER], 'restart'),
                  examples: {
                    invalidName: {
                      summary: 'Invalid application name',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Application name path parameter is invalid or missing.',
                        [{ field: 'name', message: 'name cannot be empty' }]
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
                  schema: createError401Schema(),
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
                  schema: createError403Schema([
                    ErrorCode.PERMISSION_DENIED,
                    ErrorCode.INSUFFICIENT_BALANCE
                  ]),
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
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Application not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Application "web-api" not found in the current namespace. Please verify the application name.'
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
                  schema: createError500Schema([
                    ErrorCode.KUBERNETES_ERROR,
                    ErrorCode.OPERATION_FAILED,
                    ErrorCode.INTERNAL_ERROR
                  ]),
                  examples: {
                    restartFailed: {
                      summary: 'Restart operation failed',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to restart application "web-api". The Kubernetes operation encountered an error.',
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
