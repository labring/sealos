import { createDocument } from 'zod-openapi';
import { NextResponse } from 'next/server';
import {
  RequestSchema as CreateDevboxRequestSchema,
  CreateDevboxResponseSchema,
  DevboxListResponseSchemaV1 as GetDevboxListResponseSchema
} from '../../v2alpha/devbox/schema';

import {
  UpdateDevboxRequestSchema,
  DevboxDetailResponseSchema
} from '../../v2alpha/devbox/[name]/schema';

import { RequestSchema as PauseDevboxRequestSchema } from '../../v2alpha/devbox/[name]/pause/schema';

import { RequestSchema as ShutdownDevboxRequestSchema } from '../../v2alpha/devbox/[name]/shutdown/schema';

import { RequestSchema as RestartDevboxRequestSchema } from '../../v2alpha/devbox/[name]/restart/schema';

import { AutostartRequestSchema } from '../../v2alpha/devbox/[name]/autostart/schema';

import {
  RequestSchema as ReleaseDevboxRequestSchema,
  GetSuccessResponseSchema as ReleaseDevboxGetSuccessResponseSchema
} from '../../v2alpha/devbox/[name]/releases/schema';

import { SuccessResponseSchema as GetDevboxTemplatesSuccessResponseSchema } from '../../v2alpha/devbox/templates/schema';

import { MonitorSuccessResponseSchema } from '../../v2alpha/devbox/[name]/monitor/schema';

import { GetSuccessResponseSchema as GetDeployListSuccessResponseSchema } from '../../v2alpha/devbox/[name]/deployments/schema';

import {
  createError400Schema,
  createError401Schema,
  createError404Schema,
  createError409Schema,
  createError422Schema,
  createError500Schema,
  ErrorType,
  ErrorCode,
  createErrorExample
} from '@/app/api/v2alpha/api-error';

// ---------------------------------------------------------------------------
// Shared parameter and response helpers (reduce repetition)
// ---------------------------------------------------------------------------

const devboxNameParam = {
  name: 'name',
  in: 'path',
  required: true,
  description: 'Devbox name (format: lowercase alphanumeric with hyphens, 1–63 characters)',
  schema: {
    type: 'string',
    pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
    minLength: 1,
    maxLength: 63,
    example: 'my-python-api'
  }
} as const;

const releaseTagParam = {
  name: 'tag',
  in: 'path',
  required: true,
  description: 'Release version tag (format: lowercase alphanumeric with hyphens, 1–63 characters)',
  schema: {
    type: 'string',
    pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
    minLength: 1,
    maxLength: 63,
    example: 'v1-0-0'
  }
} as const;

const unauthorizedResponse = {
  description: 'No valid credentials provided, or credentials have expired.',
  content: {
    'application/json': {
      schema: createError401Schema(),
      examples: {
        unauthorized: {
          summary: 'Authentication required',
          value: createErrorExample(
            ErrorType.AUTHENTICATION_ERROR,
            ErrorCode.AUTHENTICATION_REQUIRED,
            'No valid credentials provided.'
          )
        }
      }
    }
  }
} as const;

// ---------------------------------------------------------------------------
// Document builder
// ---------------------------------------------------------------------------

const tmpOpenApiDocument = (sealosDomain: string) =>
  createDocument({
    openapi: '3.1.0',
    info: {
      title: 'Devbox API',
      version: '2.0.0-alpha',
      description:
        'Manage Devbox development environments — create, configure, control lifecycle, and monitor container-based isolated dev environments.\n\n' +
        '## Authentication\n\n' +
        'All endpoints require authentication via URL-encoded kubeconfig. Set the `Authorization` header to `encodeURIComponent(kubeconfigYaml)` before sending the request. Obtain your kubeconfig from the Sealos console.\n\n' +
        '## Errors\n\n' +
        'All error responses use a unified format:\n\n' +
        '```json\n' +
        '{\n' +
        '  "error": {\n' +
        '    "type": "validation_error",\n' +
        '    "code": "INVALID_PARAMETER",\n' +
        '    "message": "...",\n' +
        '    "details": [...]\n' +
        '  }\n' +
        '}\n' +
        '```\n\n' +
        '- `type` — high-level category (e.g. `validation_error`, `resource_error`, `internal_error`)\n' +
        '- `code` — stable identifier for programmatic handling\n' +
        '- `message` — human-readable explanation\n' +
        '- `details` — optional extra context; shape varies by `code`\n\n' +
        '## Operations\n\n' +
        '**Query** (read-only): returns `200 OK` with data in the response body.\n\n' +
        '**Mutation** (write):\n' +
        '- Create (sync) → `201 Created` with the created resource in the response body.\n' +
        '- Create (async) → `202 Accepted` with `{ "name": "...", "status": "creating" }`. Poll the corresponding `GET` endpoint to track progress.\n' +
        '- Update / Delete / Action → `204 No Content` with no response body.'
    },
    tags: [
      {
        name: 'Query',
        description: 'Read-only operations. Success: `200 OK` with data in the response body.'
      },
      {
        name: 'Mutation',
        description:
          'Write operations. Sync create: `201 Created` with the new resource. ' +
          'Async create: `202 Accepted` with `{ name, status }` (poll GET to track progress). ' +
          'Update/Delete/Action: `204 No Content`.'
      }
    ],
    servers: [
      {
        url: 'http://localhost:3000/api/v2alpha',
        description: 'Local development'
      },
      {
        url: `https://devbox.${sealosDomain}/api/v2alpha`,
        description: 'Production'
      },
      {
        url: '{baseUrl}/api/v2alpha',
        description: 'Custom',
        variables: {
          baseUrl: {
            default: 'https://devbox.example.com',
            description: 'Base URL of your instance (e.g. https://devbox.192.168.x.x.nip.io)'
          }
        }
      }
    ],
    components: {
      securitySchemes: {
        kubeconfigAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description:
            'URL-encoded kubeconfig YAML. Encode with `encodeURIComponent(kubeconfigYaml)` ' +
            'before setting the header value. Obtain your kubeconfig from the Sealos console.'
        },
        jwtAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization-Bearer',
          description: 'JWT token for authentication. Header: `Authorization-Bearer: <token>`'
        }
      }
    },
    security: [{ kubeconfigAuth: [] }, { jwtAuth: [] }],
    paths: {
      '/devbox': {
        get: {
          tags: ['Query'],
          operationId: 'listDevboxes',
          summary: 'List all devboxes',
          description:
            'Retrieve all Devbox instances in the current namespace with resource and runtime information.',
          responses: {
            '200': {
              description: 'Devbox list retrieved successfully.',
              content: {
                'application/json': {
                  schema: GetDevboxListResponseSchema,
                  examples: {
                    success: {
                      summary: 'Two devboxes',
                      value: [
                        {
                          name: 'my-python-api',
                          uid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                          resourceType: 'devbox',
                          runtime: 'python',
                          status: 'running',
                          quota: { cpu: 1, memory: 2 }
                        },
                        {
                          name: 'my-go-service',
                          uid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
                          resourceType: 'devbox',
                          runtime: 'go',
                          status: 'stopped',
                          quota: { cpu: 2, memory: 4 }
                        }
                      ]
                    },
                    empty: {
                      summary: 'No devboxes',
                      value: []
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '500': {
              description: 'Failed to retrieve the devbox list.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to list devboxes from Kubernetes.'
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
          operationId: 'createDevbox',
          summary: 'Create a new devbox',
          description:
            'Create a new Devbox instance with the specified runtime, resources, and network ports. CPU and memory quota must be in the range [0.1, 32].',
          requestBody: {
            description:
              'Devbox creation parameters.\n\n' +
              '**Example — Python devbox with a public HTTP port:**\n' +
              '```json\n' +
              '{\n' +
              '  "name": "my-python-api",\n' +
              '  "runtime": "python",\n' +
              '  "quota": { "cpu": 1, "memory": 2 },\n' +
              '  "ports": [{ "number": 8080, "protocol": "http", "isPublic": true }],\n' +
              '  "env": [],\n' +
              '  "autostart": false\n' +
              '}\n' +
              '```\n\n' +
              '**Example — Go devbox with environment variables and autostart:**\n' +
              '```json\n' +
              '{\n' +
              '  "name": "my-go-service",\n' +
              '  "runtime": "go",\n' +
              '  "quota": { "cpu": 0.5, "memory": 1 },\n' +
              '  "ports": [],\n' +
              '  "env": [{ "name": "GO_ENV", "value": "development" }],\n' +
              '  "autostart": true\n' +
              '}\n' +
              '```\n\n' +
              '**Example — minimal resources (floor values):**\n' +
              '```json\n' +
              '{\n' +
              '  "name": "my-minimal-devbox",\n' +
              '  "runtime": "node.js",\n' +
              '  "quota": { "cpu": 0.1, "memory": 0.1 },\n' +
              '  "ports": [],\n' +
              '  "env": [],\n' +
              '  "autostart": false\n' +
              '}\n' +
              '```',
            required: true,
            content: {
              'application/json': {
                schema: CreateDevboxRequestSchema
              }
            }
          },
          responses: {
            '201': {
              description:
                'Devbox created. SSH connection details (port, private key, domain) are provisioned synchronously and returned in this response. ' +
                'The container pod starts asynchronously — poll `GET /devbox/{name}` until `status` is `running` before establishing an SSH connection.',
              content: {
                'application/json': {
                  schema: CreateDevboxResponseSchema,
                  examples: {
                    success: {
                      summary: 'Devbox created (pod starting)',
                      value: {
                        name: 'my-python-api',
                        sshPort: 40001,
                        base64PrivateKey: 'LS0tLS1CRUdJTi...',
                        userName: 'devbox',
                        workingDir: '/home/devbox/project',
                        domain: 'cloud.sealos.io',
                        ports: [
                          {
                            portName: 'port-abc123def456',
                            number: 8080,
                            protocol: 'http',
                            networkName: 'my-python-api-xyz789abc123',
                            isPublic: true,
                            publicDomain: 'xyz789abc.cloud.sealos.io',
                            customDomain: '',
                            serviceName: 'my-python-api',
                            privateAddress: 'http://my-python-api.ns-user123:8080'
                          }
                        ],
                        summary: { totalPorts: 1, successfulPorts: 1, failedPorts: 0 }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Request body failed validation.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidParam: {
                      summary: 'Missing required field',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid request body',
                        [{ field: 'name', message: 'String must contain at least 1 character(s)' }]
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'The specified runtime does not exist or is not available.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    runtimeNotFound: {
                      summary: 'Runtime not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        "Runtime 'invalid-runtime' not found or not available."
                      )
                    }
                  }
                }
              }
            },
            '409': {
              description: 'A Devbox with the specified name already exists.',
              content: {
                'application/json': {
                  schema: createError409Schema([ErrorCode.ALREADY_EXISTS]),
                  examples: {
                    alreadyExists: {
                      summary: 'Name conflict',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.ALREADY_EXISTS,
                        'Devbox already exists.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to create the Devbox.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Internal server error.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}': {
        get: {
          tags: ['Query'],
          operationId: 'getDevbox',
          summary: 'Get devbox details',
          description:
            'Retrieve complete configuration, runtime status, SSH connection information, ports, and pod list for a specific Devbox.',
          parameters: [devboxNameParam],
          responses: {
            '200': {
              description: 'Devbox details retrieved successfully.',
              content: {
                'application/json': {
                  schema: DevboxDetailResponseSchema,
                  examples: {
                    success: {
                      summary: 'Running devbox',
                      value: {
                        name: 'my-python-api',
                        uid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        resourceType: 'devbox',
                        runtime: 'python',
                        image: 'ghcr.io/labring/sealos-devbox-python:latest',
                        status: 'running',
                        quota: { cpu: 1, memory: 2 },
                        ssh: {
                          host: 'devbox.cloud.sealos.io',
                          port: 40001,
                          user: 'devbox',
                          workingDir: '/home/devbox/project',
                          privateKey: 'LS0tLS1CRUdJTi...'
                        },
                        env: [{ name: 'NODE_ENV', value: 'development' }],
                        ports: [
                          {
                            number: 8080,
                            portName: 'port-abc123',
                            protocol: 'http',
                            privateAddress: 'http://my-python-api.ns-user123:8080',
                            publicAddress: 'https://xyz789abc.cloud.sealos.io'
                          }
                        ],
                        pods: [{ name: 'my-python-api-7d8f9b6c5d-abc12', status: 'running' }]
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid devbox name.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidName: {
                      summary: 'Missing name',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Devbox name is required.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Devbox not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox not found.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to retrieve devbox details.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Internal server error.'
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
          operationId: 'updateDevbox',
          summary: 'Update devbox configuration',
          description:
            'Update Devbox resource quota and/or port configuration. CPU and memory quota must be in the range [0.1, 32].\n\n' +
            'Key points:\n' +
            '- At least one of `quota` or `ports` must be provided.\n' +
            '- To update an existing port supply its `portName`. To add a new port omit `portName`.\n' +
            '- Ports not present in the `ports` array are deleted.',
          parameters: [devboxNameParam],
          requestBody: {
            description:
              'Fields to update. At least one of `quota` or `ports` is required.\n\n' +
              '**Example — update resources only:**\n' +
              '```json\n' +
              '{\n' +
              '  "quota": { "cpu": 2, "memory": 4 }\n' +
              '}\n' +
              '```\n\n' +
              '**Example — replace all ports with a single new public port:**\n' +
              '```json\n' +
              '{\n' +
              '  "ports": [{ "number": 8080, "protocol": "http", "isPublic": true }]\n' +
              '}\n' +
              '```\n\n' +
              '**Example — update an existing port and add a new one:**\n' +
              '```json\n' +
              '{\n' +
              '  "ports": [\n' +
              '    { "portName": "port-abc123", "number": 8080, "protocol": "http", "isPublic": true },\n' +
              '    { "number": 3000, "protocol": "http", "isPublic": false }\n' +
              '  ]\n' +
              '}\n' +
              '```',
            required: true,
            content: {
              'application/json': {
                schema: UpdateDevboxRequestSchema
              }
            }
          },
          responses: {
            '204': {
              description: 'Devbox updated successfully.'
            },
            '400': {
              description: 'Request body failed validation.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidParam: {
                      summary: 'Invalid parameter',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid request body',
                        [{ field: 'quota.cpu', message: 'Expected number, received string' }]
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'Devbox not found, or a referenced `portName` does not exist.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    devboxNotFound: {
                      summary: 'Devbox not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox not found.'
                      )
                    },
                    portNotFound: {
                      summary: 'Port name not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        "Port with name 'port-abc123' not found."
                      )
                    }
                  }
                }
              }
            },
            '409': {
              description: 'Port number is already in use by another port.',
              content: {
                'application/json': {
                  schema: createError409Schema([ErrorCode.ALREADY_EXISTS, ErrorCode.CONFLICT]),
                  examples: {
                    portConflict: {
                      summary: 'Port number conflict',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.CONFLICT,
                        'Port 8080 already exists in service.'
                      )
                    }
                  }
                }
              }
            },
            '422': {
              description: 'Resource specification rejected by the Kubernetes cluster.',
              content: {
                'application/json': {
                  schema: createError422Schema(),
                  examples: {
                    invalidSpec: {
                      summary: 'Admission webhook rejection',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.INVALID_RESOURCE_SPEC,
                        'Invalid resource specification.',
                        'admission webhook "devbox.sealos.io" denied the request: quota exceeded'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to update the Devbox.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Internal server error.'
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
          operationId: 'deleteDevbox',
          summary: 'Delete a devbox',
          description:
            'Delete a Devbox and all associated resources (services, ingress rules, certificates, persistent volumes).\n\n' +
            'Key points:\n' +
            '- **Idempotent** — if the Devbox does not exist the request still returns `204`.',
          parameters: [devboxNameParam],
          responses: {
            '204': {
              description: 'Devbox deleted successfully, or did not exist (idempotent).'
            },
            '400': {
              description: 'Invalid devbox name.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidName: {
                      summary: 'Invalid name format',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid devbox name format.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '500': {
              description: 'Failed to delete the Devbox or its associated resources.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Internal server error.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/autostart': {
        post: {
          tags: ['Mutation'],
          operationId: 'autostartDevbox',
          summary: 'Configure devbox autostart',
          description:
            'Configure the command that runs automatically when the Devbox starts. If `execCommand` is omitted the default template entrypoint is used.',
          parameters: [devboxNameParam],
          requestBody: {
            description:
              'Autostart configuration. The body is optional — send `{}` to use the default entrypoint.\n\n' +
              '**Example — custom startup script:**\n' +
              '```json\n' +
              '{\n' +
              '  "execCommand": "/bin/bash /home/devbox/project/startup.sh"\n' +
              '}\n' +
              '```',
            required: false,
            content: {
              'application/json': {
                schema: AutostartRequestSchema
              }
            }
          },
          responses: {
            '204': {
              description: 'Autostart configured successfully.'
            },
            '400': {
              description: 'Invalid request parameters.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidParam: {
                      summary: 'Invalid devbox name',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid devbox name format.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Devbox not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox not found.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to configure autostart.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to create autostart resources.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/start': {
        post: {
          tags: ['Mutation'],
          operationId: 'startDevbox',
          summary: 'Start a devbox',
          description:
            'Start a paused or stopped Devbox and restore its network ingress rules to active state.\n\n' +
            'Key points:\n' +
            '- **Idempotent** — calling start on an already-running Devbox returns `204`.',
          parameters: [devboxNameParam],
          responses: {
            '204': {
              description: 'Devbox started successfully.'
            },
            '400': {
              description: 'Invalid devbox name.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidName: {
                      summary: 'Invalid name format',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid devbox name format.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Devbox not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox not found.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to start the Devbox.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to start devbox.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/pause': {
        post: {
          tags: ['Mutation'],
          operationId: 'pauseDevbox',
          summary: 'Pause a devbox',
          description:
            'Pause a Devbox to stop its compute resources while preserving port allocations, reducing costs.\n\n' +
            'Key points:\n' +
            '- **Idempotent** — calling pause on an already-paused Devbox returns `204`.',
          parameters: [devboxNameParam],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: PauseDevboxRequestSchema
              }
            }
          },
          responses: {
            '204': {
              description: 'Devbox paused successfully.'
            },
            '400': {
              description: 'Request body failed validation.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidParam: {
                      summary: 'Invalid body',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid request body.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Devbox not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox not found.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to pause the Devbox.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to pause devbox.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/shutdown': {
        post: {
          tags: ['Mutation'],
          operationId: 'shutdownDevbox',
          summary: 'Shutdown a devbox',
          description:
            'Completely shut down a Devbox, releasing all compute resources and port allocations to minimise costs.',
          parameters: [devboxNameParam],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: ShutdownDevboxRequestSchema
              }
            }
          },
          responses: {
            '204': {
              description: 'Devbox shut down successfully.'
            },
            '400': {
              description: 'Request body failed validation.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidParam: {
                      summary: 'Invalid body',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid request body.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Devbox not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox not found.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to shut down the Devbox.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to shutdown devbox.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/restart': {
        post: {
          tags: ['Mutation'],
          operationId: 'restartDevbox',
          summary: 'Restart a devbox',
          description:
            'Trigger a complete restart cycle: stop all pods, wait for termination, restore ingress, then start the Devbox.\n\n' +
            'Key points:\n' +
            '- **Idempotent** — always triggers a restart regardless of the current state.',
          parameters: [devboxNameParam],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: RestartDevboxRequestSchema
              }
            }
          },
          responses: {
            '204': {
              description: 'Devbox restarted successfully.'
            },
            '400': {
              description: 'Request body failed validation.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidParam: {
                      summary: 'Invalid body',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid request body.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Devbox not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox not found.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Restart cycle failed.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to restart devbox.'
                      )
                    },
                    timeout: {
                      summary: 'Restart timeout',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Max retries reached while waiting for devbox pod to be deleted.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/releases': {
        get: {
          tags: ['Query'],
          operationId: 'listDevboxReleases',
          summary: 'List devbox releases',
          description:
            'Retrieve all release versions for a Devbox, ordered by creation time descending.',
          parameters: [devboxNameParam],
          responses: {
            '200': {
              description: 'Release list retrieved successfully.',
              content: {
                'application/json': {
                  schema: ReleaseDevboxGetSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'One release',
                      value: [
                        {
                          id: 'release-a1b2c3',
                          name: 'my-python-api-v1-0-0',
                          devboxName: 'my-python-api',
                          createdAt: '2024-01-15 10:30',
                          tag: 'v1-0-0',
                          description: 'First stable release',
                          image: 'registry.cloud.sealos.io/ns-user123/my-python-api:v1-0-0'
                        }
                      ]
                    },
                    empty: {
                      summary: 'No releases yet',
                      value: []
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid devbox name.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidParam: {
                      summary: 'Invalid name format',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid devbox name format.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Devbox not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox not found.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to retrieve the release list.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to list DevboxRelease resources.'
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
          operationId: 'createDevboxRelease',
          summary: 'Create a devbox release',
          description:
            'Snapshot the current Devbox state and trigger a container image build for the given version tag.\n\n' +
            'Key points:\n' +
            '- **Asynchronous** — returns `202 Accepted` immediately. The build pipeline (stop devbox → build image → restart devbox) runs in the background; poll `GET /devbox/{name}/releases` to track progress.\n' +
            '- By default the Devbox is restarted after the build succeeds (`startDevboxAfterRelease: true`). Set to `false` to keep the Devbox stopped after the release.',
          parameters: [devboxNameParam],
          requestBody: {
            description:
              'Release parameters.\n\n' +
              '**Example — minimal (restart after build, no custom startup command):**\n' +
              '```json\n' +
              '{\n' +
              '  "tag": "v1-2-0",\n' +
              '  "releaseDescription": "Added API improvements and bug fixes."\n' +
              '}\n' +
              '```\n\n' +
              '**Example — keep Devbox stopped after release:**\n' +
              '```json\n' +
              '{\n' +
              '  "tag": "v1-0-0",\n' +
              '  "releaseDescription": "Hotfix",\n' +
              '  "startDevboxAfterRelease": false\n' +
              '}\n' +
              '```\n\n' +
              '**Example — restart with autostart command:**\n' +
              '```json\n' +
              '{\n' +
              '  "tag": "v1-3-0",\n' +
              '  "releaseDescription": "Adds startup script",\n' +
              '  "execCommand": "nohup /home/devbox/project/entrypoint.sh > /dev/null 2>&1 &"\n' +
              '}\n' +
              '```',
            required: true,
            content: {
              'application/json': {
                schema: ReleaseDevboxRequestSchema
              }
            }
          },
          responses: {
            '202': {
              description:
                'Release accepted. The container image build pipeline has started in the background. Poll `GET /devbox/{name}/releases` to track progress.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name', 'status'],
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Devbox name',
                        example: 'my-python-api'
                      },
                      status: {
                        type: 'string',
                        enum: ['creating'],
                        description: 'Always `creating` — the build is running asynchronously.',
                        example: 'creating'
                      }
                    }
                  },
                  examples: {
                    accepted: {
                      summary: 'Release accepted',
                      value: { name: 'my-python-api', status: 'creating' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Request body failed validation.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidTag: {
                      summary: 'Invalid tag format',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid request body',
                        [
                          {
                            field: 'tag',
                            message: 'Tag must comply with DNS naming conventions.'
                          }
                        ]
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Devbox not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox not found.'
                      )
                    }
                  }
                }
              }
            },
            '409': {
              description: 'A release with this tag already exists for this Devbox.',
              content: {
                'application/json': {
                  schema: createError409Schema([ErrorCode.ALREADY_EXISTS]),
                  examples: {
                    alreadyExists: {
                      summary: 'Tag already exists',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.ALREADY_EXISTS,
                        'Devbox release already exists.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to create the release.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Internal server error.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/deployments': {
        get: {
          tags: ['Query'],
          operationId: 'listDevboxDeployments',
          summary: 'List deployed applications from a devbox',
          description:
            "Retrieve all AppLaunchpad applications that were deployed from this Devbox's releases.",
          parameters: [devboxNameParam],
          responses: {
            '200': {
              description: 'Deployment list retrieved successfully.',
              content: {
                'application/json': {
                  schema: GetDeployListSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'Two deployments',
                      value: [
                        {
                          name: 'my-python-api-release-abc123',
                          resourceType: 'deployment',
                          tag: 'v1-0-0'
                        },
                        {
                          name: 'my-python-api-release-def456',
                          resourceType: 'statefulset',
                          tag: 'v0-9-0'
                        }
                      ]
                    },
                    empty: {
                      summary: 'No deployments',
                      value: []
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid devbox name.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidParam: {
                      summary: 'Invalid name format',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid devbox name format.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Devbox not found',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox not found.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to query deployments.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Internal server error.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/releases/{tag}': {
        delete: {
          tags: ['Mutation'],
          operationId: 'deleteDevboxRelease',
          summary: 'Delete a devbox release',
          description:
            'Delete a specific release version and its associated container image.\n\n' +
            'Key points:\n' +
            '- **Idempotent** — if the release does not exist the request still returns `204`.',
          parameters: [devboxNameParam, releaseTagParam],
          responses: {
            '204': {
              description: 'Release deleted successfully, or did not exist (idempotent).'
            },
            '400': {
              description: 'Invalid path parameters.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidParam: {
                      summary: 'Invalid parameter format',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid devbox name or release tag format.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '500': {
              description: 'Failed to delete the release.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Internal server error.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/releases/{tag}/deploy': {
        post: {
          tags: ['Mutation'],
          operationId: 'deployDevboxRelease',
          summary: 'Deploy a release to AppLaunchpad',
          description:
            'Deploy a successfully built release version as a production application in AppLaunchpad.\n\n' +
            'Key points:\n' +
            '- The release must be in `Success` status before deploying.\n' +
            '- Each call creates a new AppLaunchpad application; prior deployments are not replaced.',
          parameters: [devboxNameParam, releaseTagParam],
          responses: {
            '204': {
              description:
                'Release deployed successfully. Application is now running in AppLaunchpad.'
            },
            '400': {
              description: 'Invalid path parameters.',
              content: {
                'application/json': {
                  schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                  examples: {
                    invalidParam: {
                      summary: 'Invalid parameter format',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid devbox name or release tag format.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '404': {
              description: 'Devbox or release tag not found, or release is not in Success status.',
              content: {
                'application/json': {
                  schema: createError404Schema(),
                  examples: {
                    notFound: {
                      summary: 'Release not found or not successful',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'Devbox release tag v1-0-0 is not found or not successful.'
                      )
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Deployment failed.',
              content: {
                'application/json': {
                  schema: createError500Schema([
                    ErrorCode.OPERATION_FAILED,
                    ErrorCode.INTERNAL_ERROR
                  ]),
                  examples: {
                    deployError: {
                      summary: 'AppLaunchpad error',
                      value: createErrorExample(
                        ErrorType.OPERATION_ERROR,
                        ErrorCode.OPERATION_FAILED,
                        'Failed to deploy to AppLaunchpad.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/monitor': {
        get: {
          tags: ['Query'],
          operationId: 'getDevboxMonitor',
          summary: 'Get devbox monitoring data',
          description: 'Retrieve time-series CPU and memory usage metrics for a specific Devbox.',
          parameters: [
            devboxNameParam,
            {
              name: 'start',
              in: 'query',
              required: false,
              description:
                'Start of the monitoring window. Accepts a Unix timestamp in either **seconds** or **milliseconds** (values > 10¹² are automatically divided by 1000). Defaults to `end − 3 h`.',
              schema: { type: 'string', example: '1760510280' }
            },
            {
              name: 'end',
              in: 'query',
              required: false,
              description:
                'End of the monitoring window. Accepts a Unix timestamp in either **seconds** or **milliseconds** (values > 10¹² are automatically divided by 1000). Defaults to the current server time.',
              schema: { type: 'string', example: '1760513880' }
            },
            {
              name: 'step',
              in: 'query',
              required: false,
              description: 'Sampling interval (e.g. `1m`, `5m`, `1h`).',
              schema: { type: 'string', default: '2m', example: '2m' }
            }
          ],
          responses: {
            '200': {
              description: 'Monitoring data retrieved successfully.',
              content: {
                'application/json': {
                  schema: MonitorSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'CPU and memory metrics',
                      value: [
                        {
                          timestamp: 1760510280,
                          readableTime: '2025/10/15 14:38',
                          cpu: 1.08,
                          memory: 10.32
                        },
                        {
                          timestamp: 1760510340,
                          readableTime: '2025/10/15 14:39',
                          cpu: 1.18,
                          memory: 10.37
                        }
                      ]
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid devbox name or query parameters.',
              content: {
                'application/json': {
                  schema: createError400Schema([
                    ErrorCode.INVALID_PARAMETER,
                    ErrorCode.INVALID_VALUE
                  ]),
                  examples: {
                    invalidParam: {
                      summary: 'Invalid devbox name',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid devbox name format.'
                      )
                    },
                    invalidTimeRange: {
                      summary: 'start is not earlier than end',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_VALUE,
                        'Start timestamp must be earlier than end timestamp.'
                      )
                    }
                  }
                }
              }
            },
            '401': unauthorizedResponse,
            '500': {
              description: 'Failed to fetch monitoring data.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to fetch devbox monitor data.'
                      )
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/templates': {
        get: {
          tags: ['Query'],
          operationId: 'listDevboxTemplates',
          summary: 'List available devbox templates',
          description:
            'Retrieve available runtime environments and their default port/command configurations for creating Devboxes. This endpoint does not require authentication.',
          security: [],
          responses: {
            '200': {
              description: 'Template list retrieved successfully.',
              content: {
                'application/json': {
                  schema: GetDevboxTemplatesSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'Available runtimes',
                      value: [
                        {
                          runtime: 'python',
                          config: {
                            appPorts: [{ name: 'devbox-app-port', port: 8080, protocol: 'TCP' }],
                            ports: [
                              { containerPort: 22, name: 'devbox-ssh-port', protocol: 'TCP' }
                            ],
                            releaseArgs: ['/home/devbox/project/entrypoint.sh prod'],
                            releaseCommand: ['/bin/bash', '-c'],
                            user: 'devbox',
                            workingDir: '/home/devbox/project'
                          }
                        },
                        {
                          runtime: 'go',
                          config: {
                            appPorts: [{ name: 'devbox-app-port', port: 8080, protocol: 'TCP' }],
                            ports: [
                              { containerPort: 22, name: 'devbox-ssh-port', protocol: 'TCP' }
                            ],
                            releaseArgs: ['/home/devbox/project/entrypoint.sh prod'],
                            releaseCommand: ['/bin/bash', '-c'],
                            user: 'devbox',
                            workingDir: '/home/devbox/project'
                          }
                        }
                      ]
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to retrieve the template list.',
              content: {
                'application/json': {
                  schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                  examples: {
                    serverError: {
                      summary: 'Internal error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to query template repositories from database.'
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

export async function GET(request: Request) {
  const domain = process.env.SEALOS_DOMAIN || '';
  try {
    const openApiDoc = tmpOpenApiDocument(domain);
    return NextResponse.json(openApiDoc);
  } catch (error) {
    console.error('Error generating OpenAPI document:', error);
    return NextResponse.json({ error: 'Failed to generate API documentation' }, { status: 500 });
  }
}
