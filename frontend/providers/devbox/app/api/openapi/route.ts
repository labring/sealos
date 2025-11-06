import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import { NextResponse } from 'next/server';
import {
  RequestSchema as CreateDevboxRequestSchema,
  SuccessResponseSchema as CreateDevboxSuccessResponseSchema
} from '../v1/devbox/schema';

import {
  UpdateDevboxRequestSchema,
  UpdateDevboxResponseSchema,
  ErrorResponseSchema as UpdateDevboxErrorResponseSchema
} from '../v1/devbox/[name]/schema';

import {
  RequestSchema as DeleteDevboxRequestSchema,
  SuccessResponseSchema as DeleteDevboxSuccessResponseSchema,
  ErrorResponseSchema as DeleteDevboxErrorResponseSchema
} from '../v1/devbox/[name]/delete/schema';

import {
  RequestSchema as StartDevboxRequestSchema,
  SuccessResponseSchema as StartDevboxSuccessResponseSchema,
  ErrorResponseSchema as StartDevboxErrorResponseSchema
} from '../v1/devbox/[name]/start/schema';

import {
  RequestSchema as PauseDevboxRequestSchema,
  SuccessResponseSchema as PauseDevboxSuccessResponseSchema,
  ErrorResponseSchema as PauseDevboxErrorResponseSchema
} from '../v1/devbox/[name]/pause/schema';

import {
  RequestSchema as ShutdownDevboxRequestSchema,
  SuccessResponseSchema as ShutdownDevboxSuccessResponseSchema,
  ErrorResponseSchema as ShutdownDevboxErrorResponseSchema
} from '../v1/devbox/[name]/shutdown/schema';

import {
  RequestSchema as RestartDevboxRequestSchema,
  SuccessResponseSchema as RestartDevboxSuccessResponseSchema,
  ErrorResponseSchema as RestartDevboxErrorResponseSchema
} from '../v1/devbox/[name]/restart/schema';

import {
  AutostartRequestSchema,
  AutostartSuccessResponseSchema,
  AutostartErrorResponseSchema
} from '../v1/devbox/[name]/autostart/schema';

import {
  UpdatePortsRequestSchema,
  UpdatePortsResponseSchema,
  ErrorResponseSchema as PortsErrorResponseSchema
} from '../v1/devbox/[name]/ports/schema';

import {
  RequestSchema as ReleaseDevboxRequestSchema,
  SuccessResponseSchema as ReleaseDevboxSuccessResponseSchema,
  ErrorResponseSchema as ReleaseDevboxErrorResponseSchema,
  GetSuccessResponseSchema as ReleaseDevboxGetSuccessResponseSchema
} from '../v1/devbox/[name]/release/schema';

import {
  SuccessResponseSchema as DeleteReleaseSuccessResponseSchema,
  ErrorResponseSchema as DeleteReleaseErrorResponseSchema
} from '../v1/devbox/[name]/release/[tag]/schema';

import {
  DeployDevboxPathParamsSchema,
  DeployDevboxRequestSchema,
  DeployDevboxSuccessResponseSchema,
  DeployDevboxErrorResponseSchema
} from '../v1/devbox/[name]/release/[tag]/deploy/schema';

import {
  SuccessResponseSchema as GetDevboxTemplatesSuccessResponseSchema,
  ErrorResponseSchema as GetDevboxTemplatesErrorResponseSchema
} from '../v1/devbox/templates/schema';

const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.string().optional()
});

// generate openapi document
const tmpOpenApiDocument = (sealosDomain: string) =>
  createDocument({
    openapi: '3.0.0',
    info: {
      title: 'Devbox API',
      version: '1.0.0',
      description: `# Devbox API Documentation

## Overview
This API provides comprehensive management capabilities for Devbox instances, including lifecycle operations, release management, and runtime configurations.

## Authentication
All endpoints require authentication via:
- **kubeconfig**: Standard Kubernetes configuration for cluster access
- **JWT Token**: Bearer token for user authentication

## Base URLs
- **Development**: http://127.0.0.1:3000
- **Production**: https://devbox.{sealosDomain}

## Key Concepts
- **Devbox**: A containerized development environment with pre-configured runtime and resources
- **Runtime**: Pre-built environment templates (e.g., Node.js, Python, Go)
- **Release**: Versioned snapshots of devbox state that can be deployed
- **Ports**: Network configurations for accessing devbox services

## API Organization
APIs are organized into two main groups following GraphQL conventions:
- **Query**: Read-only operations for retrieving data (GET requests)
- **Mutation**: Write operations that modify data (POST/PUT/PATCH/DELETE requests)`
    },
    tags: [
      {
        name: 'Query',
        description: 'Read-only operations for retrieving data. These endpoints fetch information without modifying any resources.'
      },
      {
        name: 'Mutation',
        description: 'Write operations that create, update, or delete resources. These endpoints modify the system state.'
      }
    ],
    servers: [
      {
        url: `http://127.0.0.1:3000`,
        description: 'Development'
      },
      {
        url: `https://devbox.${sealosDomain}`,
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
        },
        jwtAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization-Bearer',
          description: 'JWT token for authentication'
        }
      }
    },
    security: [
      {
        kubeconfigAuth: [],
        jwtAuth: []
      }
    ],
    paths: {
      '/api/v1/devbox': {
        post: {
          tags: ['Mutation'],
          summary: 'Create a new devbox with runtime and port configuration',
          description: `Create a new Devbox development environment instance with customizable runtime, resource allocation, and port configurations.

**Key Features:**
- **Runtime Selection**: Choose from multiple pre-configured runtime environments (Node.js, Python, Go, etc.)
- **Resource Configuration**: Customize CPU and memory allocation
- **Port Management**: Configure multiple ports with optional public domain access
- **Environment Variables**: Set custom environment variables with direct values or Secret references
- **Auto-start**: Optionally auto-start the Devbox after creation

**Request Parameters:**
- \`name\`: Devbox name (must comply with Kubernetes DNS naming conventions)
- \`runtime\`: Runtime environment name (get available options from /api/v1/devbox/templates)
- \`resource\`: CPU and memory resource configuration
- \`ports\`: Array of port configurations with protocol and public access settings
- \`env\`: Array of environment variables supporting direct values or Secret references
- \`autostart\`: Whether to automatically start the Devbox after creation

**Response Data:**
Returns Devbox connection information including SSH port and private key, username and working directory, port access addresses (public and private), and creation status summary.

**Error Codes:**
- \`400\`: Invalid request parameters or validation failure
- \`404\`: Specified runtime environment not found
- \`409\`: Devbox name already exists
- \`500\`: Internal server error or resource creation failure`,
          requestBody: {
            description: 'Devbox creation configuration including runtime, resources, ports, and environment settings',
            required: true,
            content: {
              'application/json': {
                schema: CreateDevboxRequestSchema,
                examples: {
                  basic: {
                    summary: 'Basic Devbox with Node.js runtime',
                    value: {
                      name: 'my-nodejs-app',
                      runtime: 'node.js',
                      resource: {
                        cpu: 1,
                        memory: 2
                      }
                    }
                  },
                  advanced: {
                    summary: 'Advanced Devbox with ports and environment variables',
                    value: {
                      name: 'my-python-api',
                      runtime: 'python',
                      resource: {
                        cpu: 2,
                        memory: 4
                      },
                      ports: [
                        {
                          number: 8000,
                          protocol: 'HTTP',
                          exposesPublicDomain: true
                        }
                      ],
                      env: [
                        {
                          name: 'DEBUG',
                          value: 'true'
                        }
                      ],
                      autostart: true
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox created successfully. Returns connection information including SSH credentials, port configurations, and access details.',
              content: {
                'application/json': {
                  schema: CreateDevboxSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'Successful Devbox creation',
                      value: {
                        data: {
                          name: 'my-nodejs-app',
                          sshPort: 40001,
                          base64PrivateKey: 'LS0tLS1CRUdJTi...',
                          userName: 'devbox',
                          workingDir: '/home/devbox/project',
                          domain: 'cloud.sealos.io',
                          ports: [
                            {
                              portName: 'port-abc123',
                              number: 8000,
                              protocol: 'HTTP',
                              networkName: 'network-def456',
                              exposesPublicDomain: true,
                              publicDomain: 'xyz789.cloud.sealos.io',
                              customDomain: '',
                              privateAddress: 'http://my-nodejs-app.ns-user123:8000'
                            }
                          ],
                          autostarted: true,
                          summary: {
                            totalPorts: 1,
                            successfulPorts: 1,
                            failedPorts: 0
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad Request - Invalid request parameters, malformed JSON, or validation errors in the request body.',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema,
                  examples: {
                    validation_error: {
                      summary: 'Validation error example',
                      value: {
                        code: 400,
                        message: 'Invalid request body',
                        error: [
                          {
                            path: ['name'],
                            message: 'String must contain at least 1 character(s)'
                          }
                        ]
                      }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Not Found - The specified runtime environment does not exist or is not available.',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema,
                  examples: {
                    runtime_not_found: {
                      summary: 'Runtime not found example',
                      value: {
                        code: 404,
                        message: "Runtime 'invalid-runtime' not found"
                      }
                    }
                  }
                }
              }
            },
            '409': {
              description: 'Conflict - A Devbox with the specified name already exists in the current namespace.',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema,
                  examples: {
                    name_conflict: {
                      summary: 'Name conflict example',
                      value: {
                        code: 409,
                        message: 'Devbox already exists'
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal Server Error - Failed to create Devbox due to server-side issues or resource constraints.',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema,
                  examples: {
                    server_error: {
                      summary: 'Server error example',
                      value: {
                        code: 500,
                        message: 'Internal server error',
                        data: 'Failed to create Kubernetes resources'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/{name}': {
        patch: {
          tags: ['Mutation'],
          summary: 'Update devbox configuration',
          description: `Update an existing Devbox configuration including resource allocation and port management.

**Key Features:**
- **Resource Adjustment**: Dynamically adjust CPU and memory allocation without restart
- **Port Management**: Add, remove, or modify port configurations
- **Flexible Updates**: Update resources only, ports only, or both simultaneously
- **Selective Operations**: Only specified configurations are updated

**Request Parameters:**
- \`resource\` (optional): CPU and memory resource configuration for online adjustment
- \`ports\` (optional): Array of port configurations
  - Include \`portName\`: Update existing port
  - Exclude \`portName\`: Create new port
  - Existing ports not included will be deleted

**Path Parameters:**
- \`name\`: Devbox name (must comply with DNS naming conventions)

**Response Data:**
- \`resource\`: Updated resource configuration information (returned only when resources are updated)
- \`ports\`: Updated port configuration list (returned only when ports are updated)

**Error Codes:**
- \`400\`: Invalid request parameters or Devbox name format
- \`404\`: Devbox not found
- \`409\`: Port conflict - port number already in use by another service
- \`422\`: Invalid resource configuration (exceeds limits or constraints)
- \`500\`: Internal server error`,
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              description: 'Devbox name',
              schema: {
                type: 'string',
                pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
                minLength: 1,
                maxLength: 63
              }
            }
          ],
          requestBody: {
            description: 'Devbox update configuration. Specify resource and/or ports to update. At least one field is required.',
            required: true,
            content: {
              'application/json': {
                schema: UpdateDevboxRequestSchema,
                examples: {
                  resource_only: {
                    summary: 'Update resources only',
                    value: {
                      resource: {
                        cpu: 2,
                        memory: 4
                      }
                    }
                  },
                  ports_only: {
                    summary: 'Update ports only',
                    value: {
                      ports: [
                        {
                          portName: 'existing-port-name',
                          number: 8080,
                          protocol: 'HTTP',
                          exposesPublicDomain: true
                        },
                        {
                          number: 3000,
                          protocol: 'HTTP',
                          exposesPublicDomain: false
                        }
                      ]
                    }
                  },
                  both: {
                    summary: 'Update both resources and ports',
                    value: {
                      resource: {
                        cpu: 4,
                        memory: 8
                      },
                      ports: [
                        {
                          number: 8000,
                          protocol: 'HTTP',
                          exposesPublicDomain: true,
                          customDomain: 'api.example.com'
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox updated successfully. Returns the updated configuration details for the modified components.',
              content: {
                'application/json': {
                  schema: UpdateDevboxResponseSchema,
                  examples: {
                    resource_updated: {
                      summary: 'Resource update response',
                      value: {
                        data: {
                          resource: {
                            name: 'my-devbox',
                            resource: {
                              cpu: 2,
                              memory: 4
                            },
                            k8sResource: {
                              cpu: '2',
                              memory: '4Gi'
                            },
                            status: 'Running',
                            updatedAt: '2023-12-07T10:00:00.000Z'
                          }
                        }
                      }
                    },
                    ports_updated: {
                      summary: 'Ports update response',
                      value: {
                        data: {
                          ports: [
                            {
                              portName: 'port-abc123',
                              number: 8080,
                              protocol: 'HTTP',
                              networkName: 'network-def456',
                              exposesPublicDomain: true,
                              publicDomain: 'xyz789.cloud.sealos.io',
                              customDomain: '',
                              serviceName: 'my-devbox',
                              privateAddress: 'http://my-devbox.ns-user123:8080'
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad Request - Invalid request parameters, malformed JSON, or validation errors.',
              content: {
                'application/json': {
                  schema: UpdateDevboxErrorResponseSchema,
                  examples: {
                    invalid_name: {
                      summary: 'Invalid devbox name',
                      value: {
                        code: 400,
                        message: 'Invalid devbox name format'
                      }
                    },
                    validation_error: {
                      summary: 'Request validation error',
                      value: {
                        code: 400,
                        message: 'Invalid request body',
                        error: 'At least one of resource or ports must be provided'
                      }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Not Found - The specified Devbox does not exist in the current namespace.',
              content: {
                'application/json': {
                  schema: UpdateDevboxErrorResponseSchema,
                  examples: {
                    devbox_not_found: {
                      summary: 'Devbox not found',
                      value: {
                        code: 404,
                        message: 'Devbox not found'
                      }
                    }
                  }
                }
              }
            },
            '409': {
              description: 'Conflict - Port number is already in use by another service or resource.',
              content: {
                'application/json': {
                  schema: UpdateDevboxErrorResponseSchema,
                  examples: {
                    port_conflict: {
                      summary: 'Port conflict error',
                      value: {
                        code: 409,
                        message: 'Port conflict - port number already in use',
                        error: 'Port 8080 is already in use by another service'
                      }
                    }
                  }
                }
              }
            },
            '422': {
              description: 'Unprocessable Entity - Invalid resource configuration that exceeds limits or constraints.',
              content: {
                'application/json': {
                  schema: UpdateDevboxErrorResponseSchema,
                  examples: {
                    resource_limit: {
                      summary: 'Resource limit exceeded',
                      value: {
                        code: 422,
                        message: 'Invalid resource configuration',
                        error: 'CPU request exceeds namespace quota'
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal Server Error - Failed to update Devbox due to server-side issues.',
              content: {
                'application/json': {
                  schema: UpdateDevboxErrorResponseSchema,
                  examples: {
                    update_failed: {
                      summary: 'Update operation failed',
                      value: {
                        code: 500,
                        message: 'Internal server error',
                        error: 'Failed to update Kubernetes resources'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/{name}/delete': {
      delete: {
          tags: ['Mutation'],
        summary: 'Delete a devbox by name',
          description: `Delete a Devbox and all its associated resources including services, ingress, certificates, and persistent volumes.

**Key Features:**
- **Complete Cleanup**: Removes all Kubernetes resources associated with the Devbox
- **Cascade Deletion**: Automatically deletes dependent resources (services, ingresses, PVCs)
- **Safe Operation**: Validates existence before deletion
- **Irreversible**: This action cannot be undone

**Path Parameters:**
- \`name\`: Devbox name to delete (must comply with DNS naming conventions)

**Response Data:**
Returns a success message confirming the deletion.

**Error Codes:**
- \`400\`: Invalid devbox name format
- \`404\`: Devbox not found
- \`500\`: Failed to delete Devbox or associated resources`,
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'Devbox name to delete',
            schema: {
              type: 'string',
              pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
              minLength: 1,
              maxLength: 63
            }
          }
        ],
        responses: {
          '200': {
              description: 'Devbox deleted successfully. All associated resources have been removed.',
            content: {
              'application/json': {
                  schema: DeleteDevboxSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'Successful deletion',
                      value: {
                        data: 'success delete devbox'
                      }
                    }
                  }
              }
            }
          },
          '400': {
              description: 'Bad Request - Invalid devbox name format or validation error.',
            content: {
              'application/json': {
                  schema: DeleteDevboxErrorResponseSchema,
                  examples: {
                    invalid_name: {
                      summary: 'Invalid devbox name',
                      value: {
                        code: 400,
                        message: 'Invalid devbox name format'
                      }
                    }
                  }
              }
            }
          },
          '404': {
              description: 'Not Found - The specified Devbox does not exist.',
            content: {
              'application/json': {
                  schema: DeleteDevboxErrorResponseSchema,
                  examples: {
                    not_found: {
                      summary: 'Devbox not found',
                      value: {
                        code: 404,
                        message: 'Devbox not found'
                      }
                    }
                  }
              }
            }
          },
          '500': {
              description: 'Internal Server Error - Failed to delete Devbox or its associated resources.',
            content: {
              'application/json': {
                  schema: DeleteDevboxErrorResponseSchema,
                  examples: {
                    deletion_failed: {
                      summary: 'Deletion operation failed',
                      value: {
                        code: 500,
                        message: 'Internal server error',
                        error: 'Failed to delete Kubernetes resources'
                      }
                    }
                  }
              }
            }
          }
        }
      }
    },
    '/api/v1/devbox/{name}/autostart': {
      post: {
        tags: ['Mutation'],
        summary: 'Configure autostart for a devbox',
        description: `Configure automatic command execution when the Devbox starts. Creates RBAC and Job resources for autostart functionality.

**Key Features:**
- **Auto-execution**: Run custom commands automatically on Devbox startup
- **RBAC Setup**: Creates ServiceAccount, Role, and RoleBinding for secure execution
- **Job Management**: Creates Kubernetes Job to execute startup commands
- **Custom Commands**: Support for user-defined startup scripts

**Path Parameters:**
- \`name\`: Devbox name (must comply with DNS naming conventions)

**Request Body:**
- \`execCommand\` (optional): Custom command to execute on startup. Defaults to runtime-specific entrypoint if not provided.

**Response Data:**
Returns autostart configuration status including whether resources were created and any job recreation information.

**Error Codes:**
- \`400\`: Invalid request parameters or devbox name format
- \`404\`: Devbox not found
- \`500\`: Failed to create autostart resources`,
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'Devbox name',
            schema: {
              type: 'string',
              pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
              minLength: 1,
              maxLength: 63
            }
          }
        ],
        requestBody: {
          description: 'Autostart configuration with optional custom execution command',
          required: false,
          content: {
            'application/json': {
              schema: AutostartRequestSchema,
              examples: {
                default: {
                  summary: 'Use default entrypoint',
                  value: {}
                },
                custom_command: {
                  summary: 'Custom startup command',
                  value: {
                    execCommand: '/bin/bash /home/devbox/project/startup.sh'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Autostart resources created successfully. RBAC and Job resources have been configured.',
            content: {
              'application/json': {
                schema: AutostartSuccessResponseSchema,
                examples: {
                  success: {
                    summary: 'Autostart configured successfully',
                    value: {
                      data: {
                        devboxName: 'my-devbox',
                        autostartCreated: true,
                        jobRecreated: false,
                        resources: [
                          'ServiceAccount/my-devbox-autostart',
                          'Role/my-devbox-autostart',
                          'RoleBinding/my-devbox-autostart',
                          'Job/my-devbox-autostart'
                        ]
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid request parameters or devbox name format.',
            content: {
              'application/json': {
                schema: AutostartErrorResponseSchema,
                examples: {
                  invalid_name: {
                    summary: 'Invalid devbox name',
                    value: {
                      code: 400,
                      message: 'Invalid devbox name format'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - The specified Devbox does not exist.',
            content: {
              'application/json': {
                schema: AutostartErrorResponseSchema,
                examples: {
                  not_found: {
                    summary: 'Devbox not found',
                    value: {
                      code: 404,
                      message: 'Devbox not found'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to create autostart resources.',
            content: {
              'application/json': {
                schema: AutostartErrorResponseSchema,
                examples: {
                  creation_failed: {
                    summary: 'Resource creation failed',
                    value: {
                      code: 500,
                      message: 'Internal server error',
                      error: 'Failed to create RBAC resources'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
      '/api/v1/devbox/{name}/start': {
      post: {
        tags: ['Mutation'],
        summary: 'Start a devbox',
        description: `Start a paused or stopped Devbox and restore its services to active state.

**Key Features:**
- **State Transition**: Changes Devbox state from Stopped/Paused to Running
- **Ingress Restoration**: Restores ingress configurations from pause backend to nginx
- **Service Recovery**: Brings pods back online with full functionality
- **Quick Resume**: Faster than creating a new Devbox

**Path Parameters:**
- \`name\`: Devbox name to start (must comply with DNS naming conventions)

**Request Body:**
Empty request body (no parameters required)

**Response Data:**
Returns a success message confirming the Devbox has been started.

**Error Codes:**
- \`400\`: Invalid request parameters or devbox name format
- \`404\`: Devbox not found
- \`500\`: Failed to start Devbox or restore services`,
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'Devbox name',
            schema: {
              type: 'string',
              pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
              minLength: 1,
              maxLength: 63
            }
          }
        ],
        requestBody: {
          description: 'Empty request body - no parameters required for starting a Devbox',
          required: false,
          content: {
            'application/json': {
              schema: StartDevboxRequestSchema,
              examples: {
                default: {
                  summary: 'Start devbox',
                  value: {}
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Devbox started successfully. Pods are starting and ingress has been restored.',
            content: {
              'application/json': {
                schema: StartDevboxSuccessResponseSchema,
                examples: {
                  success: {
                    summary: 'Successfully started',
                    value: {
                      data: 'success start devbox'
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid request parameters or devbox name format.',
            content: {
              'application/json': {
                schema: StartDevboxErrorResponseSchema,
                examples: {
                  invalid_name: {
                    summary: 'Invalid name format',
                    value: {
                      code: 400,
                      message: 'Invalid devbox name format'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - The specified Devbox does not exist.',
            content: {
              'application/json': {
                schema: StartDevboxErrorResponseSchema,
                examples: {
                  not_found: {
                    summary: 'Devbox not found',
                    value: {
                      code: 404,
                      message: 'Devbox not found'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to start Devbox or restore services.',
            content: {
              'application/json': {
                schema: StartDevboxErrorResponseSchema,
                examples: {
                  start_failed: {
                    summary: 'Start operation failed',
                    value: {
                      code: 500,
                      message: 'Internal server error',
                      error: 'Failed to restore ingress configuration'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
'/api/v1/devbox/{name}/pause': {
  post: {
    tags: ['Mutation'],
    summary: 'Pause a devbox',
    description: `Temporarily pause a Devbox while maintaining port allocations and configurations.

**Key Features:**
- **State Transition**: Changes Devbox state from Running to Stopped
- **Resource Saving**: Stops compute resources to reduce costs
- **Port Preservation**: Maintains port allocations (minimal port fees apply)
- **Quick Recovery**: Can be quickly resumed with start operation
- **Data Persistence**: All data and configurations are preserved

**Path Parameters:**
- \`name\`: Devbox name to pause (must comply with DNS naming conventions)

**Request Body:**
Empty request body (no parameters required)

**Response Data:**
Returns a success message confirming the Devbox has been paused.

**Error Codes:**
- \`400\`: Invalid request parameters or devbox name format
- \`404\`: Devbox not found
- \`500\`: Failed to pause Devbox or update ingress`,
    parameters: [
      {
        name: 'name',
        in: 'path',
        required: true,
        description: 'Devbox name',
        schema: {
          type: 'string',
          pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
          minLength: 1,
          maxLength: 63
        }
      }
    ],
    requestBody: {
      description: 'Empty request body - no parameters required for pausing a Devbox',
      required: false,
      content: {
        'application/json': {
          schema: PauseDevboxRequestSchema,
          examples: {
            default: {
              summary: 'Pause devbox',
              value: {}
            }
          }
        }
      }
    },
    responses: {
      '200': {
        description: 'Devbox paused successfully. Compute resources stopped, ports maintained.',
        content: {
          'application/json': {
            schema: PauseDevboxSuccessResponseSchema,
            examples: {
              success: {
                summary: 'Successfully paused',
                value: {
                  data: 'success pause devbox'
                }
              }
            }
          }
        }
      },
      '400': {
        description: 'Bad Request - Invalid request parameters or devbox name format.',
        content: {
          'application/json': {
            schema: PauseDevboxErrorResponseSchema,
            examples: {
              invalid_name: {
                summary: 'Invalid name format',
                value: {
                  code: 400,
                  message: 'Invalid devbox name format'
                }
              }
            }
          }
        }
      },
      '404': {
        description: 'Not Found - The specified Devbox does not exist.',
        content: {
          'application/json': {
            schema: PauseDevboxErrorResponseSchema,
            examples: {
              not_found: {
                summary: 'Devbox not found',
                value: {
                  code: 404,
                  message: 'Devbox not found'
                }
              }
            }
          }
        }
      },
      '500': {
        description: 'Internal Server Error - Failed to pause Devbox or update ingress configuration.',
        content: {
          'application/json': {
            schema: PauseDevboxErrorResponseSchema,
            examples: {
              pause_failed: {
                summary: 'Pause operation failed',
                value: {
                  code: 500,
                  message: 'Internal server error',
                  error: 'Failed to update ingress to pause state'
                }
              }
            }
          }
        }
      }
    }
  }
},
'/api/v1/devbox/{name}/shutdown': {
  post: {
    tags: ['Mutation'],
    summary: 'Shutdown a devbox',
    description: `Completely shutdown a Devbox and release all port allocations to minimize costs.

**Key Features:**
- **Complete Shutdown**: Changes Devbox state from Running to Shutdown
- **Port Release**: Releases all port allocations (no port fees)
- **Cost Optimization**: Frees both compute and network resources
- **Data Persistence**: All data volumes are preserved
- **Cold Start**: Requires full startup when reactivated

**Difference from Pause:**
- **Shutdown**: Releases ports (no port fees) - use for long-term stops
- **Pause**: Maintains ports (small port fees) - use for short-term stops

**Path Parameters:**
- \`name\`: Devbox name to shutdown (must comply with DNS naming conventions)

**Request Body:**
Empty request body (no parameters required)

**Response Data:**
Returns a success message confirming the Devbox has been shut down.

**Error Codes:**
- \`400\`: Invalid request parameters or devbox name format
- \`404\`: Devbox not found
- \`500\`: Failed to shutdown Devbox or release ports`,
    parameters: [
      {
        name: 'name',
        in: 'path',
        required: true,
        description: 'Devbox name',
        schema: {
          type: 'string',
          pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
          minLength: 1,
          maxLength: 63
        }
      }
    ],
    requestBody: {
      description: 'Empty request body - no parameters required for shutting down a Devbox',
      required: false,
      content: {
        'application/json': {
          schema: ShutdownDevboxRequestSchema,
          examples: {
            default: {
              summary: 'Shutdown devbox',
              value: {}
            }
          }
        }
      }
    },
    responses: {
      '200': {
        description: 'Devbox shutdown successfully. All compute resources and ports have been released.',
        content: {
          'application/json': {
            schema: ShutdownDevboxSuccessResponseSchema,
            examples: {
              success: {
                summary: 'Successfully shut down',
                value: {
                  data: 'success shutdown devbox'
                }
              }
            }
          }
        }
      },
      '400': {
        description: 'Bad Request - Invalid request parameters or devbox name format.',
        content: {
          'application/json': {
            schema: ShutdownDevboxErrorResponseSchema,
            examples: {
              invalid_name: {
                summary: 'Invalid name format',
                value: {
                  code: 400,
                  message: 'Invalid devbox name format'
                }
              }
            }
          }
        }
      },
      '404': {
        description: 'Not Found - The specified Devbox does not exist.',
        content: {
          'application/json': {
            schema: ShutdownDevboxErrorResponseSchema,
            examples: {
              not_found: {
                summary: 'Devbox not found',
                value: {
                  code: 404,
                  message: 'Devbox not found'
                }
              }
            }
          }
        }
      },
      '500': {
        description: 'Internal Server Error - Failed to shutdown Devbox or release ports.',
        content: {
          'application/json': {
            schema: ShutdownDevboxErrorResponseSchema,
            examples: {
              shutdown_failed: {
                summary: 'Shutdown operation failed',
                value: {
                  code: 500,
                  message: 'Internal server error',
                  error: 'Failed to release port resources'
                }
              }
            }
          }
        }
      }
    }
  }
},
'/api/v1/devbox/{name}/restart': {
  post: {
    tags: ['Mutation'],
    summary: 'Restart a devbox',
    description: `Perform a complete restart cycle of a Devbox, useful for applying configuration changes or recovering from errors.

**Key Features:**
- **Complete Restart Cycle**: Stop → Wait for pod deletion → Restore ingress → Start
- **Clean State**: Ensures all containers are recreated with fresh state
- **Configuration Refresh**: Applies any pending configuration changes
- **Timeout Protection**: Includes timeout handling for pod deletion
- **Ingress Recovery**: Automatically restores networking configuration

**Path Parameters:**
- \`name\`: Devbox name to restart (must comply with DNS naming conventions)

**Request Body:**
Empty request body (no parameters required)

**Response Data:**
Returns a success message confirming the Devbox has been restarted.

**Error Codes:**
- \`400\`: Invalid request parameters or devbox name format
- \`404\`: Devbox not found
- \`408\`: Request timeout - pods did not delete within expected time
- \`500\`: Failed to restart Devbox`,
    parameters: [
      {
        name: 'name',
        in: 'path',
        required: true,
        description: 'Devbox name',
        schema: {
          type: 'string',
          pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
          minLength: 1,
          maxLength: 63
        }
      }
    ],
    requestBody: {
      description: 'Empty request body - no parameters required for restarting a Devbox',
      required: false,
      content: {
        'application/json': {
          schema: RestartDevboxRequestSchema,
          examples: {
            default: {
              summary: 'Restart devbox',
              value: {}
            }
          }
        }
      }
    },
    responses: {
      '200': {
        description: 'Devbox restarted successfully. Complete restart cycle completed with all services restored.',
        content: {
          'application/json': {
            schema: RestartDevboxSuccessResponseSchema,
            examples: {
              success: {
                summary: 'Successfully restarted',
                value: {
                  data: 'success restart devbox'
                }
              }
            }
          }
        }
      },
      '400': {
        description: 'Bad Request - Invalid request parameters or devbox name format.',
        content: {
          'application/json': {
            schema: RestartDevboxErrorResponseSchema,
            examples: {
              invalid_name: {
                summary: 'Invalid name format',
                value: {
                  code: 400,
                  message: 'Invalid devbox name format'
                }
              }
            }
          }
        }
      },
      '404': {
        description: 'Not Found - The specified Devbox does not exist.',
        content: {
          'application/json': {
            schema: RestartDevboxErrorResponseSchema,
            examples: {
              not_found: {
                summary: 'Devbox not found',
                value: {
                  code: 404,
                  message: 'Devbox not found'
                }
              }
            }
          }
        }
      },
      '408': {
        description: 'Request Timeout - Pods did not delete within the expected time window during restart.',
        content: {
          'application/json': {
            schema: RestartDevboxErrorResponseSchema,
            examples: {
              timeout: {
                summary: 'Restart timeout',
                value: {
                  code: 408,
                  message: 'Restart timeout - pods did not delete within expected time',
                  error: 'Pod deletion took longer than 5 minutes'
                }
              }
            }
          }
        }
      },
      '500': {
        description: 'Internal Server Error - Failed to complete the restart cycle.',
        content: {
          'application/json': {
            schema: RestartDevboxErrorResponseSchema,
            examples: {
              restart_failed: {
                summary: 'Restart operation failed',
                value: {
                  code: 500,
                  message: 'Internal server error',
                  error: 'Failed to restore services after restart'
                }
              }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/devbox/{name}/ports': {
    put: {
    tags: ['Mutation'],
    summary: 'Update devbox port configurations',
    description: `Manage Devbox port configurations with support for adding, updating, and removing ports.

**Key Features:**
- **Port Updates**: Modify existing port configurations (protocol, public access, custom domain)
- **Port Creation**: Add new ports to expose additional services
- **Port Deletion**: Remove ports by excluding them from the request
- **Declarative Management**: Specify desired state, system handles the diff
- **Public Domain Support**: Auto-generate or use custom domains

**Path Parameters:**
- \`name\`: Devbox name (must comply with DNS naming conventions)

**Request Body:**
Array of port configurations:
- **With portName**: Updates existing port
- **Without portName**: Creates new port
- **Ports not included**: Will be deleted

**Response Data:**
Returns the complete list of port configurations after the update operation, including generated public domains and network names.

**Error Codes:**
- \`400\`: Invalid request parameters or port configuration
- \`404\`: Devbox not found
- \`500\`: Failed to update port configurations`,
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              description: 'Devbox name',
              schema: {
                type: 'string',
                pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
                minLength: 1,
                maxLength: 63
              }
            }
          ],
          requestBody: {
        description: 'Port configuration array specifying the desired state of all ports. Ports not included will be deleted.',
        required: true,
            content: {
              'application/json': {
            schema: UpdatePortsRequestSchema,
            examples: {
              update_existing: {
                summary: 'Update existing port',
                value: {
                  ports: [
                    {
                      portName: 'existing-port-abc',
                      number: 8080,
                      protocol: 'HTTP',
                      exposesPublicDomain: true
                    }
                  ]
                }
              },
              create_new: {
                summary: 'Create new ports',
                value: {
                  ports: [
                    {
                      number: 3000,
                      protocol: 'HTTP',
                      exposesPublicDomain: true
                    },
                    {
                      number: 5432,
                      protocol: 'HTTP',
                      exposesPublicDomain: false
                    }
                  ]
                }
              },
              mixed_operations: {
                summary: 'Update, create, and delete ports',
                value: {
                  ports: [
                    {
                      portName: 'keep-port-abc',
                      number: 8080,
                      protocol: 'GRPC',
                      exposesPublicDomain: true,
                      customDomain: 'api.example.com'
                    },
                    {
                      number: 9000,
                      protocol: 'HTTP',
                      exposesPublicDomain: true
                    }
                  ]
                }
              }
            }
              }
            }
          },
          responses: {
            '200': {
          description: 'DevBox ports updated successfully. Returns the complete list of active ports with their configurations.',
              content: {
                'application/json': {
              schema: UpdatePortsResponseSchema,
              examples: {
                success: {
                  summary: 'Ports updated successfully',
                  value: {
                    data: {
                      ports: [
                        {
                          portName: 'port-abc123',
                          number: 8080,
                          protocol: 'HTTP',
                          networkName: 'network-def456',
                          exposesPublicDomain: true,
                          publicDomain: 'xyz789.cloud.sealos.io',
                          customDomain: '',
                          serviceName: 'my-devbox',
                          privateAddress: 'http://my-devbox.ns-user123:8080'
                        },
                        {
                          portName: 'port-ghi789',
                          number: 3000,
                          protocol: 'HTTP',
                          networkName: 'network-jkl012',
                          exposesPublicDomain: true,
                          publicDomain: 'mno345.cloud.sealos.io',
                          customDomain: '',
                          serviceName: 'my-devbox',
                          privateAddress: 'http://my-devbox.ns-user123:3000'
                        }
                      ]
                    }
                  }
                }
              }
                }
              }
            },
            '400': {
          description: 'Bad Request - Invalid request parameters, port configuration, or devbox name format.',
              content: {
                'application/json': {
              schema: PortsErrorResponseSchema,
              examples: {
                invalid_port: {
                  summary: 'Invalid port configuration',
                  value: {
                    code: 400,
                    message: 'Invalid request body',
                    error: 'Port number must be between 1 and 65535'
                  }
                }
              }
                }
              }
            },
            '404': {
          description: 'Not Found - The specified Devbox does not exist.',
              content: {
                'application/json': {
              schema: PortsErrorResponseSchema,
              examples: {
                not_found: {
                  summary: 'Devbox not found',
                  value: {
                    code: 404,
                    message: 'Devbox not found'
                  }
                }
              }
                }
              }
            },
            '500': {
          description: 'Internal Server Error - Failed to update port configurations or create ingress resources.',
              content: {
                'application/json': {
              schema: PortsErrorResponseSchema,
              examples: {
                update_failed: {
                  summary: 'Port update failed',
                  value: {
                    code: 500,
                    message: 'Internal server error',
                    error: 'Failed to update service ports'
                  }
                }
              }
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/{name}/release': {
        get: {
      tags: ['Query'],
          summary: 'Get devbox release list by name',
      description: `Retrieve all release versions for a specific Devbox, including version history and status information.

**Key Features:**
- **Version History**: List all releases with creation timestamps
- **Status Tracking**: View release status (Success, Building, Failed)
- **Image Information**: Get container image addresses for each release
- **Tag Management**: See all version tags and descriptions

**Path Parameters:**
- \`name\`: Devbox name (must comply with DNS naming conventions)

**Response Data:**
Returns an array of release objects, each containing:
- Release ID and name
- Version tag and description
- Creation time
- Build status
- Container image address

**Error Codes:**
- \`400\`: Invalid devbox name format
- \`500\`: Failed to retrieve release list`,
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              description: 'Devbox name',
              schema: {
                type: 'string',
                pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
                minLength: 1,
                maxLength: 63
              }
            }
          ],
          responses: {
            '200': {
          description: 'Successfully retrieved devbox release list with version history and status information.',
              content: {
                'application/json': {
              schema: ReleaseDevboxGetSuccessResponseSchema,
              examples: {
                success: {
                  summary: 'Release list retrieved',
                  value: {
                    data: [
                      {
                        id: 'release-123-abc',
                        name: 'my-devbox-v1.0.0',
                        devboxName: 'my-devbox',
                        createTime: '2024-01-15 10:30',
                        tag: 'v1.0.0',
                        status: {
                          value: 'Success',
                          label: 'Success'
                        },
                        description: 'First stable release',
                        image: 'registry.cloud.sealos.io/ns-user123/my-devbox:v1.0.0'
                      },
                      {
                        id: 'release-456-def',
                        name: 'my-devbox-v0.9.0',
                        devboxName: 'my-devbox',
                        createTime: '2024-01-10 09:15',
                        tag: 'v0.9.0',
                        status: {
                          value: 'Success',
                          label: 'Success'
                        },
                        description: 'Beta release',
                        image: 'registry.cloud.sealos.io/ns-user123/my-devbox:v0.9.0'
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Bad Request - Invalid devbox name format.',
          content: {
            'application/json': {
              schema: ReleaseDevboxErrorResponseSchema,
              examples: {
                invalid_name: {
                  summary: 'Invalid devbox name',
                  value: {
                    code: 400,
                    message: 'Invalid devbox name format'
                  }
                }
              }
            }
          }
        },
        '500': {
          description: 'Internal Server Error - Failed to retrieve release list from Kubernetes.',
          content: {
            'application/json': {
              schema: ReleaseDevboxErrorResponseSchema,
              examples: {
                retrieval_failed: {
                  summary: 'Failed to get releases',
                  value: {
                    code: 500,
                    message: 'Internal server error',
                    error: 'Failed to list DevboxRelease resources'
                  }
                }
              }
            }
          }
        }
      }
    },
        post: {
          tags: ['Mutation'],
          summary: 'Release a specific devbox version',
          description: `Create a new release version by snapshotting the current Devbox state and building a container image.

**Key Features:**
- **Version Snapshot**: Captures the current state of the Devbox
- **Image Building**: Automatically builds and pushes a container image
- **Tag Management**: Version releases with custom tags
- **Description Support**: Add release notes and descriptions
- **Deployment Ready**: Released images can be deployed to production

**Prerequisites:**
- Devbox must be in **Stopped** or **Paused** state before releasing
- Devbox must exist and be accessible

**Path Parameters:**
- \`name\`: Devbox name to release (must comply with DNS naming conventions)

**Request Body:**
- \`tag\`: Version tag for this release (must be unique)
- \`releaseDes\`: Optional description or release notes

**Response Data:**
Returns release creation information including the assigned tag, description, and creation timestamp.

**Error Codes:**
- \`400\`: Invalid request parameters or devbox name format
- \`404\`: Devbox not found
- \`409\`: Release with the same tag already exists
- \`500\`: Failed to create release or build image`,
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              description: 'Devbox name',
              schema: {
                type: 'string',
                pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
                minLength: 1,
                maxLength: 63
              }
            }
          ],
          requestBody: {
            description: 'Release configuration with version tag and optional description',
            required: true,
            content: {
              'application/json': {
                schema: ReleaseDevboxRequestSchema,
                examples: {
                  basic: {
                    summary: 'Basic release',
                    value: {
                      tag: 'v1.0.0',
                      releaseDes: ''
                    }
                  },
                  with_description: {
                    summary: 'Release with description',
                    value: {
                      tag: 'v1.2.0',
                      releaseDes: 'Added new features: API improvements, bug fixes, performance optimization'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox release created successfully. Image building process has started.',
              content: {
                'application/json': {
                  schema: ReleaseDevboxSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'Release created',
                      value: {
                        data: {
                          devboxName: 'my-devbox',
                          tag: 'v1.0.0',
                          releaseDes: 'First stable release',
                          image: 'registry.cloud.sealos.io/ns-user123/my-devbox:v1.0.0',
                          createdAt: '2024-01-15T10:30:00.000Z'
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad Request - Invalid request body, tag format, or devbox name.',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema,
                  examples: {
                    invalid_tag: {
                      summary: 'Invalid tag format',
                      value: {
                        code: 400,
                        message: 'Invalid request body',
                        error: 'Tag must comply with DNS naming conventions'
                      }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Not Found - The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema,
                  examples: {
                    not_found: {
                      summary: 'Devbox not found',
                      value: {
                        code: 404,
                        message: 'Devbox not found'
                      }
                    }
                  }
                }
              }
            },
            '409': {
              description: 'Conflict - A release with the specified tag already exists for this Devbox.',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema,
                  examples: {
                    tag_conflict: {
                      summary: 'Tag already exists',
                      value: {
                        code: 409,
                        message: 'Devbox release with this tag already exists',
                        error: 'Release v1.0.0 already exists'
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal Server Error - Failed to create release or build container image.',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema,
                  examples: {
                    creation_failed: {
                      summary: 'Release creation failed',
                      value: {
                        code: 500,
                        message: 'Internal server error',
                        error: 'Failed to create DevboxRelease resource'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/{name}/release/{tag}': {
      delete: {
        tags: ['Mutation'],
        summary: 'Delete a specific devbox release',
        description: `Delete a specific release version and its associated container image.

**Key Features:**
- **Release Deletion**: Removes DevboxRelease resource from Kubernetes
- **Image Cleanup**: Deletes the associated container image from registry
- **Safe Operation**: Validates release existence before deletion
- **Irreversible**: This action cannot be undone

**Path Parameters:**
- \`name\`: Devbox name (must comply with DNS naming conventions)
- \`tag\`: Release tag to delete (must comply with DNS naming conventions)

**Response Data:**
Returns deletion confirmation with the devbox name, deleted tag, and timestamp.

**Error Codes:**
- \`400\`: Invalid devbox name or release tag format
- \`404\`: Release not found
- \`500\`: Failed to delete release or container image`,
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'Devbox name',
            schema: {
              type: 'string',
              pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
              minLength: 1,
              maxLength: 63
            }
          },
          {
            name: 'tag',
            in: 'path',
            required: true,
            description: 'Release name to delete',
            schema: {
              type: 'string',
              pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
              minLength: 1,
              maxLength: 63
            }
          }
        ],
        responses: {
          '200': {
            description: 'Release deleted successfully. The release and its container image have been removed.',
            content: {
              'application/json': {
                schema: DeleteReleaseSuccessResponseSchema,
                examples: {
                  success: {
                    summary: 'Release deleted',
                    value: {
                      data: {
                        devboxName: 'my-devbox',
                        tag: 'v1.0.0',
                        message: 'Release deleted successfully',
                        deletedAt: '2024-01-16T14:20:00.000Z'
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid devbox name or release tag format.',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  invalid_format: {
                    summary: 'Invalid parameter format',
                    value: {
                      code: 400,
                      message: 'Invalid devbox name or release name format'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - The specified release does not exist.',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  not_found: {
                    summary: 'Release not found',
                    value: {
                      code: 404,
                      message: 'Release not found',
                      data: 'Release v1.0.0 does not exist for devbox my-devbox'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to delete release or container image.',
            content: {
              'application/json': {
                schema: ErrorResponseSchema,
                examples: {
                  deletion_failed: {
                    summary: 'Deletion failed',
                    value: {
                      code: 500,
                      message: 'Internal server error',
                      data: 'Failed to delete container image from registry'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
      '/api/v1/devbox/{name}/release/{tag}/deploy': {
        post: {
          tags: ['Mutation'],
          summary: 'Deploy a specific devbox release version',
          description: `Deploy a release version to AppLaunchpad as a production application.

**Key Features:**
- **Production Deployment**: Converts Devbox release to production application
- **Fixed Resources**: Deploys with 2 CPU cores and 2GB memory configuration
- **Port Mapping**: Automatically maps Devbox ports to application services
- **Environment Preservation**: Maintains environment variables from the Devbox
- **Public Access**: Generates public domains for exposed ports

**Prerequisites:**
- Release must exist and be in **Success** status
- Release image building must be completed

**Path Parameters:**
- \`name\`: Devbox name (must comply with DNS naming conventions)
- \`tag\`: Release version tag to deploy

**Request Body:**
Empty request body (no parameters required)

**Response Data:**
Returns deployment information including:
- Application configuration details
- Public domain access URLs
- Resource allocations
- Port mappings

**Error Codes:**
- \`400\`: Invalid request parameters or path format
- \`404\`: Devbox or release tag not found
- \`500\`: Deployment failed or internal error`,
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              description: 'Devbox name',
              schema: {
                type: 'string',
                pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
                minLength: 1,
                maxLength: 63
              }
            },
            {
              name: 'tag',
              in: 'path',
              required: true,
              description: 'Devbox release version tag',
              schema: {
                type: 'string',
                minLength: 1
              }
            }
          ],
          requestBody: {
            description: 'Empty request body - deployment uses release configuration',
            required: false,
            content: {
              'application/json': {
                schema: DeployDevboxRequestSchema,
                examples: {
                  default: {
                    summary: 'Deploy release',
                    value: {}
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox release deployed successfully to AppLaunchpad. Application is now running in production.',
              content: {
                'application/json': {
                  schema: DeployDevboxSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'Deployment successful',
                      value: {
                        data: {
                          message: 'success deploy devbox',
                          launchpadApp: {
                            name: 'my-devbox-v1-0-0',
                            image: 'registry.cloud.sealos.io/ns-user123/my-devbox:v1.0.0',
                            command: '/bin/bash',
                            args: '-c /home/devbox/project/entrypoint.sh',
                            resource: {
                              replicas: 1,
                              cpu: 2000,
                              memory: 2048
                            },
                            ports: [
                              {
                                port: 8080,
                                protocol: 'TCP',
                                appProtocol: 'HTTP',
                                exposesPublicDomain: true,
                                publicDomain: 'app123.cloud.sealos.io'
                              }
                            ]
                          },
                          publicDomains: [
                            {
                              host: 'app123.cloud.sealos.io',
                              port: 8080
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad Request - Invalid request body or path parameters.',
              content: {
                'application/json': {
                  schema: DeployDevboxErrorResponseSchema,
                  examples: {
                    invalid_params: {
                      summary: 'Invalid parameters',
                      value: {
                        code: 400,
                        error: 'Invalid devbox name or tag format'
                      }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Not Found - Devbox or release tag does not exist, or release is not in Success status.',
              content: {
                'application/json': {
                  schema: DeployDevboxErrorResponseSchema,
                  examples: {
                    release_not_found: {
                      summary: 'Release not found',
                      value: {
                        code: 404,
                        error: 'Release tag v1.0.0 not found for devbox my-devbox'
                      }
                    },
                    release_not_ready: {
                      summary: 'Release not ready',
                      value: {
                        code: 404,
                        error: 'Release is not in Success status. Current status: Building'
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal Server Error - Deployment failed or AppLaunchpad service error.',
              content: {
                'application/json': {
                  schema: DeployDevboxErrorResponseSchema,
                  examples: {
                    deployment_failed: {
                      summary: 'Deployment failed',
                      value: {
                        code: 500,
                        error: 'Failed to create application in AppLaunchpad'
                }
              }
            }
          }
        }
            }
          }
        }
      },
      '/api/v1/devbox/templates': {
        get: {
          tags: ['Query'],
          summary: 'Get devbox configuration and runtime information',
          description: `Retrieve available runtime environments and template configurations for creating Devboxes.

**Key Features:**
- **Runtime Discovery**: List all available runtime environments (languages, frameworks, OS)
- **Template Details**: Get configuration details for each template
- **Version Information**: View template versions and specifications
- **Configuration Preview**: See default ports, commands, and working directories

**No Parameters Required:**
This endpoint requires no query parameters or request body.

**Response Data:**
Returns two arrays:
- \`runtime\`: List of available template repositories (runtime environments)
  - Template repository UID and name
  - Icon ID (runtime identifier)
  - Kind (FRAMEWORK, OS, LANGUAGE, SERVICE, CUSTOM)
  - Description and public access status
  
- \`config\`: List of template configurations
  - Template UID and name
  - Runtime association
  - Configuration details (ports, commands, user, working directory)

**Error Codes:**
- \`500\`: Failed to retrieve templates from database or Kubernetes`,
          responses: {
            '200': {
              description: 'Successfully retrieved devbox configuration. Returns available runtimes and their template configurations.',
              content: {
                'application/json': {
                  schema: GetDevboxTemplatesSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'Templates retrieved',
                      value: {
                        data: {
                          runtime: [
                            {
                              uid: 'tpl-repo-123',
                              iconId: 'node.js',
                              name: 'Node.js Runtime',
                              kind: 'LANGUAGE',
                              description: 'Node.js JavaScript runtime environment',
                              isPublic: true
                            },
                            {
                              uid: 'tpl-repo-456',
                              iconId: 'python',
                              name: 'Python Runtime',
                              kind: 'LANGUAGE',
                              description: 'Python programming language runtime',
                              isPublic: true
                            }
                          ],
                          config: [
                            {
                              templateUid: 'tpl-123-abc',
                              templateName: 'Node.js 20 LTS',
                              runtimeUid: 'tpl-repo-123',
                              runtime: 'node.js',
                              config: {
                                appPorts: [
                                  {
                                    name: 'http',
                                    port: 3000,
                                    protocol: 'HTTP'
                                  }
                                ],
                                ports: [
                                  {
                                    containerPort: 3000,
                                    name: 'http',
                                    protocol: 'TCP'
                                  }
                                ],
                                releaseCommand: ['/bin/bash', '-c'],
                                releaseArgs: ['npm', 'start'],
                                user: 'devbox',
                                workingDir: '/home/devbox/project'
                              }
                            }
                          ]
                        }
                      }
                    }
              }
            }
          }
        },
        '500': {
              description: 'Internal Server Error - Failed to retrieve templates from database or process configurations.',
          content: {
            'application/json': {
                  schema: GetDevboxTemplatesErrorResponseSchema,
                  examples: {
                    retrieval_failed: {
                      summary: 'Failed to get templates',
                                value: {
                        code: 500,
                        error: 'Failed to query template repositories from database'
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
