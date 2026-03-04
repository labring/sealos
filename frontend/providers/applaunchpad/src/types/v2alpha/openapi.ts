import { createDocument } from 'zod-openapi';
import { z } from 'zod';
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
    openapi: '3.1.0',
    info: {
      title: 'Application Launchpad API',
      version: '2.0.0-alpha',
      description:
        'Application Launchpad is a Sealos service for deploying and managing containerized applications on Kubernetes. ' +
        'This API allows you to create, query, update, delete, start, pause, and restart applications programmatically.\n\n' +
        '## Authentication\n\n' +
        'All requests require a valid kubeconfig passed in the `Authorization` header.\n\n' +
        'Encode the kubeconfig YAML string with `encodeURIComponent()` before setting the header:\n\n' +
        '```\n' +
        'Authorization: <encodeURIComponent(kubeconfigYaml)>\n' +
        '```\n\n' +
        'Obtain your kubeconfig from the Sealos console user menu. ' +
        'A missing or invalid kubeconfig results in a `401 Unauthorized` response.\n\n' +
        '## Errors\n\n' +
        'All error responses use a unified format:\n\n' +
        '```json\n' +
        '{\n' +
        '  "error": {\n' +
        '    "type": "validation_error",\n' +
        '    "code": "INVALID_PARAMETER",\n' +
        '    "message": "Request body validation failed.",\n' +
        '    "details": [{ "field": "image.imageName", "message": "Required" }]\n' +
        '  }\n' +
        '}\n' +
        '```\n\n' +
        '- `type` — high-level category (e.g. `validation_error`, `resource_error`, `internal_error`)\n' +
        '- `code` — stable identifier for programmatic handling\n' +
        '- `message` — human-readable explanation\n' +
        '- `details` — optional extra context; shape varies by `code` (field list, string, or object)\n\n' +
        '## Operations\n\n' +
        '**Query** (read-only): returns `200 OK` with data in the response body.\n\n' +
        '**Mutation** (write): Create → `201 Created` with the created resource. Update/Delete → `204 No Content`.'
    },
    servers: [
      {
        url: `http://localhost:3000/api/v2alpha`,
        description: 'Local development'
      },
      {
        url: getProductionServerUrl(),
        description: 'Production'
      },
      {
        url: `{baseUrl}/api/v2alpha`,
        description: 'Custom',
        variables: {
          baseUrl: {
            default: 'https://applaunchpad.example.com',
            description: 'Base URL of your instance (e.g. https://applaunchpad.192.168.x.x.nip.io)'
          }
        }
      }
    ],
    tags: [
      {
        name: 'Query',
        description: 'Read-only operations. Success: `200 OK` with data in the response body.'
      },
      {
        name: 'Mutation',
        description:
          'Write operations. Create: `201 Created` with the new resource. Update/Delete: `204 No Content`.'
      }
    ],
    components: {
      securitySchemes: {
        kubeconfigAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description:
            'Kubeconfig encoded with `encodeURIComponent()`. Example: `Authorization: <encodeURIComponent(kubeconfigYaml)>`. ' +
            'Obtain your kubeconfig from the Sealos console user menu.'
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
        get: {
          tags: ['Query'],
          operationId: 'listApps',
          summary: 'List all applications',
          description: 'Returns all applications deployed in the current namespace.',
          responses: {
            '200': {
              description: 'List of applications retrieved successfully',
              content: {
                'application/json': {
                  schema: z.array(LaunchpadApplicationSchema),
                  examples: {
                    list: {
                      summary: 'List of applications',
                      value: [
                        {
                          name: 'web-api',
                          resourceType: 'launchpad',
                          kind: 'deployment',
                          image: { imageName: 'nginx:1.21', imageRegistry: null },
                          quota: { cpu: 0.5, memory: 1, replicas: 1 },
                          ports: [
                            {
                              number: 80,
                              portName: 'abcdef123456',
                              protocol: 'http',
                              privateAddress: 'http://web-api-80-xyz-service.ns-user123:80',
                              publicAddress: 'https://xyz789abc123.cloud.sealos.io'
                            }
                          ],
                          env: [],
                          storage: [],
                          configMap: [],
                          uid: 'abc123-def456-789',
                          createdAt: '2024-01-01T00:00:00Z',
                          upTime: '2h15m',
                          status: 'running'
                        }
                      ]
                    },
                    empty: {
                      summary: 'No applications deployed',
                      value: []
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
                  schema: createError403Schema([ErrorCode.PERMISSION_DENIED], 'list apps'),
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
            '500': {
              description: 'Internal Server Error',
              content: {
                'application/json': {
                  schema: createError500Schema([
                    ErrorCode.KUBERNETES_ERROR,
                    ErrorCode.INTERNAL_ERROR
                  ]),
                  examples: {
                    kubernetesError: {
                      summary: 'Kubernetes API error',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.KUBERNETES_ERROR,
                        'Failed to list applications.',
                        'namespaces "ns-xxx" not found'
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
                  schema: createError503Schema('list apps'),
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
        },
        post: {
          tags: ['Mutation'],
          operationId: 'createApp',
          summary: 'Create a new application',
          description:
            'Creates a new containerized application with specified quota, networking, storage, and environment configurations.\n\n' +
            'Key points:\n' +
            '- Quota: Use `quota.replicas` (1–20) for fixed replicas, or `quota.hpa` for auto-scaling (cannot use both). CPU and memory must be in range [0.1, 32]\n' +
            '- Image: Set `image.imageRegistry` to `null` for public images, or provide credentials for private images\n' +
            '- Ports: `http`/`grpc`/`ws` protocols support a public domain; `tcp`/`udp`/`sctp` use NodePort\n' +
            '- Storage: Providing storage creates a StatefulSet instead of a Deployment\n\n' +
            '**Example — minimal deployment (public image, fixed replicas):**\n' +
            '```json\n' +
            '{\n' +
            '  "name": "web-api",\n' +
            '  "image": {\n' +
            '    "imageName": "nginx:1.21",\n' +
            '    "imageRegistry": null\n' +
            '  },\n' +
            '  "quota": {\n' +
            '    "cpu": 0.5,\n' +
            '    "memory": 1,\n' +
            '    "replicas": 1\n' +
            '  },\n' +
            '  "ports": [\n' +
            '    { "number": 80, "protocol": "http", "isPublic": true }\n' +
            '  ]\n' +
            '}\n' +
            '```\n\n' +
            '**Example — StatefulSet with persistent storage:**\n' +
            '```json\n' +
            '{\n' +
            '  "name": "db-service",\n' +
            '  "image": {\n' +
            '    "imageName": "postgres:15",\n' +
            '    "imageRegistry": null\n' +
            '  },\n' +
            '  "quota": {\n' +
            '    "cpu": 1,\n' +
            '    "memory": 2,\n' +
            '    "replicas": 1\n' +
            '  },\n' +
            '  "ports": [\n' +
            '    { "number": 5432, "protocol": "tcp" }\n' +
            '  ],\n' +
            '  "storage": [\n' +
            '    { "path": "/var/lib/postgresql/data", "size": "20Gi" }\n' +
            '  ],\n' +
            '  "env": [\n' +
            '    { "key": "POSTGRES_PASSWORD", "value": "secret" }\n' +
            '  ]\n' +
            '}\n' +
            '```\n\n' +
            '**Example — HPA auto-scaling with private registry:**\n' +
            '```json\n' +
            '{\n' +
            '  "name": "api-service",\n' +
            '  "image": {\n' +
            '    "imageName": "registry.example.com/myapp:v2",\n' +
            '    "imageRegistry": {\n' +
            '      "username": "robot$myproject",\n' +
            '      "password": "token",\n' +
            '      "apiUrl": "registry.example.com"\n' +
            '    }\n' +
            '  },\n' +
            '  "quota": {\n' +
            '    "cpu": 1,\n' +
            '    "memory": 2,\n' +
            '    "hpa": {\n' +
            '      "target": "cpu",\n' +
            '      "value": 60,\n' +
            '      "minReplicas": 1,\n' +
            '      "maxReplicas": 5\n' +
            '    }\n' +
            '  },\n' +
            '  "ports": [\n' +
            '    { "number": 8080, "protocol": "http", "isPublic": true }\n' +
            '  ]\n' +
            '}\n' +
            '```',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: CreateLaunchpadRequestSchema
              }
            }
          },
          responses: {
            '201': {
              description: 'Application created successfully',
              content: {
                'application/json': {
                  schema: LaunchpadApplicationSchema,
                  examples: {
                    created: {
                      summary: 'Newly created application',
                      value: {
                        name: 'web-api',
                        resourceType: 'launchpad',
                        kind: 'deployment',
                        image: { imageName: 'nginx:1.21', imageRegistry: null },
                        quota: { cpu: 0.5, memory: 1, replicas: 1 },
                        ports: [
                          {
                            number: 80,
                            portName: 'abcdef123456',
                            protocol: 'http',
                            privateAddress: 'http://web-api-80-xyz-service.ns-user123:80',
                            publicAddress: 'https://xyz789abc123.cloud.sealos.io',
                            customDomain: ''
                          }
                        ],
                        uid: 'app-12345',
                        createdAt: '2024-01-01T00:00:00Z',
                        upTime: '0s',
                        status: 'creating'
                      }
                    }
                  }
                }
              }
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
          operationId: 'getApp',
          summary: 'Get application details by name',
          description:
            'Retrieves complete application configuration and current runtime status.\n\n' +
            'The response includes all fields needed to inspect or reproduce the application: image, resource quota, ports (with private and public addresses), environment variables, ConfigMap, storage, and current status.',
          parameters: [
            {
              name: 'name',
              in: 'path',
              description:
                'Application name (Kubernetes resource name, must be a valid DNS subdomain: lowercase alphanumeric, hyphens)',
              required: true,
              example: 'web-api',
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
          operationId: 'updateApp',
          summary: 'Update application configuration',
          description:
            'Partially updates application configuration. Supports quota, image, ports, env, storage, and ConfigMap.\n\n' +
            'Key points:\n' +
            '- Quota: Switch between fixed replicas and HPA by providing one and omitting the other. CPU must be one of: 0.1, 0.2, 0.5, 1, 2, 3, 4, 8 (cores); Memory must be one of: 0.1, 0.5, 1, 2, 4, 8, 16 (GB)\n' +
            '- Image: Change image or switch public/private (set `imageRegistry` to `null` for public)\n' +
            '- Ports: Complete replacement — include `portName` to update an existing port, omit to create, unlisted ports are deleted, use `[]` to remove all\n' +
            '- ConfigMap: Complete replacement — provide all entries to keep, use `[]` to remove all, omit to keep unchanged\n' +
            '- Storage: Complete replacement — provide all entries to keep, use `[]` to remove all, omit to keep unchanged\n' +
            '- Storage: If the application is a Deployment, adding storage automatically converts it to a StatefulSet (brief downtime)\n' +
            '- All changes are applied atomically\n\n' +
            '**Example — scale up quota:**\n' +
            '```json\n' +
            '{\n' +
            '  "quota": {\n' +
            '    "cpu": 2,\n' +
            '    "memory": 4,\n' +
            '    "replicas": 3\n' +
            '  }\n' +
            '}\n' +
            '```\n\n' +
            '**Example — switch from fixed replicas to HPA:**\n' +
            '```json\n' +
            '{\n' +
            '  "quota": {\n' +
            '    "cpu": 1,\n' +
            '    "memory": 2,\n' +
            '    "hpa": {\n' +
            '      "target": "cpu",\n' +
            '      "value": 70,\n' +
            '      "minReplicas": 1,\n' +
            '      "maxReplicas": 10\n' +
            '    }\n' +
            '  }\n' +
            '}\n' +
            '```\n\n' +
            '**Example — update image:**\n' +
            '```json\n' +
            '{\n' +
            '  "image": {\n' +
            '    "imageName": "nginx:1.25",\n' +
            '    "imageRegistry": null\n' +
            '  }\n' +
            '}\n' +
            '```\n\n' +
            '**Example — full port list replacement (update existing port + add new port):**\n' +
            '```json\n' +
            '{\n' +
            '  "ports": [\n' +
            '    { "portName": "abcdef123456", "number": 80, "protocol": "http", "isPublic": true },\n' +
            '    { "number": 9090, "protocol": "http", "isPublic": false }\n' +
            '  ]\n' +
            '}\n' +
            '```',
          parameters: [
            {
              name: 'name',
              in: 'path',
              description:
                'Application name (Kubernetes resource name, must be a valid DNS subdomain: lowercase alphanumeric, hyphens)',
              required: true,
              example: 'web-api',
              schema: {
                type: 'string',
                minLength: 1,
                example: 'web-api'
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
          operationId: 'deleteApp',
          summary: 'Delete application',
          description:
            'Permanently deletes the application and all associated Kubernetes resources (Deployments/StatefulSets, Services, Ingresses, ConfigMaps, Secrets).\n\n' +
            'Key points:\n' +
            '- Pods are terminated gracefully (30s grace period)\n' +
            '- For StatefulSet applications, PVCs are preserved by default\n' +
            '- Idempotent: returns `204` even if the application does not exist\n' +
            '- **Irreversible**',
          parameters: [
            {
              name: 'name',
              in: 'path',
              description:
                'Application name (Kubernetes resource name, must be a valid DNS subdomain: lowercase alphanumeric, hyphens)',
              required: true,
              example: 'web-api',
              schema: {
                type: 'string',
                minLength: 1,
                example: 'web-api'
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
          operationId: 'startApp',
          summary: 'Start paused application',
          description:
            'Resumes a paused application by restoring replica count or HPA configuration.\n\n' +
            'Pods are restored to handle traffic. Services and ingresses remain active throughout. ' +
            'Typically takes 1–3 minutes to reach full availability. ' +
            'If the application is already running, returns `204` immediately (idempotent).',
          parameters: [
            {
              name: 'name',
              in: 'path',
              description:
                'Application name (Kubernetes resource name, must be a valid DNS subdomain: lowercase alphanumeric, hyphens)',
              required: true,
              example: 'web-api',
              schema: {
                type: 'string',
                minLength: 1,
                example: 'web-api'
              }
            }
          ],
          responses: {
            '204': {
              description: 'Application started successfully (or was already running)'
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
                  schema: createError403Schema([ErrorCode.PERMISSION_DENIED], 'start'),
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
          operationId: 'pauseApp',
          summary: 'Pause application',
          description:
            'Temporarily stops an application by scaling replicas to zero while preserving its configuration.\n\n' +
            'Key points:\n' +
            '- Replica/HPA state is stored and restored on next start\n' +
            '- Pods are terminated gracefully (30s grace period)\n' +
            '- Services and ingresses remain but route no traffic\n' +
            '- Storage is preserved\n' +
            '- Typical compute cost reduction: 60–80%\n' +
            '- This operation is idempotent: pausing an already-paused application returns `204` with no changes',
          parameters: [
            {
              name: 'name',
              in: 'path',
              description:
                'Application name (Kubernetes resource name, must be a valid DNS subdomain: lowercase alphanumeric, hyphens)',
              required: true,
              example: 'web-api',
              schema: {
                type: 'string',
                minLength: 1,
                example: 'web-api'
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
                  schema: createError403Schema([ErrorCode.PERMISSION_DENIED], 'pause'),
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
          operationId: 'updateAppStorage',
          summary: 'Update application storage (incremental)',
          description:
            'Incrementally updates storage volumes for a StatefulSet application.\n\n' +
            'Key points:\n' +
            '- Only StatefulSet applications are supported (Deployment returns `400`)\n' +
            '- Incremental merge: pass only the volumes you want to add or resize — unlisted volumes are preserved\n' +
            '- To remove a volume, use `PATCH /apps/{name}` with a complete storage replacement\n' +
            '- Storage can only be expanded, not shrunk (PVC limitation)\n' +
            '- Changes are applied by deleting and recreating the StatefulSet — brief downtime is expected',
          parameters: [
            {
              name: 'name',
              in: 'path',
              description:
                'Application name (Kubernetes resource name, must be a valid DNS subdomain: lowercase alphanumeric, hyphens)',
              required: true,
              example: 'web-api',
              schema: {
                type: 'string',
                minLength: 1,
                example: 'web-api'
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
                  schema: createError403Schema([ErrorCode.PERMISSION_DENIED], 'storage'),
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
          operationId: 'restartApp',
          summary: 'Restart application',
          description:
            'Performs a rolling restart of all application pods while maintaining service availability.\n\n' +
            'Key points:\n' +
            '- Zero-downtime for applications with multiple replicas; 30–90s downtime for single-replica applications\n' +
            '- Typical duration: 30–90s (single replica) to 2–5 min (multiple replicas)\n' +
            '- Does **not** update configuration — use `PATCH /apps/{name}` for config changes',
          parameters: [
            {
              name: 'name',
              in: 'path',
              description:
                'Application name (Kubernetes resource name, must be a valid DNS subdomain: lowercase alphanumeric, hyphens)',
              required: true,
              example: 'web-api',
              schema: {
                type: 'string',
                minLength: 1,
                example: 'web-api'
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
                  schema: createError403Schema([ErrorCode.PERMISSION_DENIED], 'restart'),
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
