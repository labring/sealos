import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import { NextResponse } from 'next/server';
import {
  RequestSchema as CreateDevboxRequestSchema,
  SuccessResponseSchema as CreateDevboxSuccessResponseSchema,
  DevboxListResponseSchemaV1 as GetDevboxListResponseSchema
} from '../../v2alpha/devbox/schema';

import {
  UpdateDevboxRequestSchema,
  UpdateDevboxResponseSchema,
  ErrorResponseSchema as UpdateDevboxErrorResponseSchema,
  DevboxDetailResponseSchema,
  DeleteDevboxRequestSchema,
  DeleteDevboxResponseSchema as DeleteDevboxSuccessResponseSchema
} from '../../v2alpha/devbox/[name]/schema';

import {
  RequestSchema as StartDevboxRequestSchema,
  SuccessResponseSchema as StartDevboxSuccessResponseSchema,
  ErrorResponseSchema as StartDevboxErrorResponseSchema
} from '../../v2alpha/devbox/[name]/start/schema';

import {
  RequestSchema as PauseDevboxRequestSchema,
  SuccessResponseSchema as PauseDevboxSuccessResponseSchema,
  ErrorResponseSchema as PauseDevboxErrorResponseSchema
} from '../../v2alpha/devbox/[name]/pause/schema';

import {
  RequestSchema as ShutdownDevboxRequestSchema,
  SuccessResponseSchema as ShutdownDevboxSuccessResponseSchema,
  ErrorResponseSchema as ShutdownDevboxErrorResponseSchema
} from '../../v2alpha/devbox/[name]/shutdown/schema';

import {
  RequestSchema as RestartDevboxRequestSchema,
  SuccessResponseSchema as RestartDevboxSuccessResponseSchema,
  ErrorResponseSchema as RestartDevboxErrorResponseSchema
} from '../../v2alpha/devbox/[name]/restart/schema';

import {
  AutostartRequestSchema,
  AutostartSuccessResponseSchema,
  AutostartErrorResponseSchema
} from '../../v2alpha/devbox/[name]/autostart/schema';
import {
  RequestSchema as ReleaseDevboxRequestSchema,
  SuccessResponseSchema as ReleaseDevboxSuccessResponseSchema,
  ErrorResponseSchema as ReleaseDevboxErrorResponseSchema,
  GetSuccessResponseSchema as ReleaseDevboxGetSuccessResponseSchema
} from '../../v2alpha/devbox/[name]/release/schema';

import {
  SuccessResponseSchema as DeleteReleaseSuccessResponseSchema,
  ErrorResponseSchema as DeleteReleaseErrorResponseSchema
} from '../../v2alpha/devbox/[name]/release/[tag]/schema';

import {
  DeployDevboxPathParamsSchema,
  DeployDevboxRequestSchema,
  DeployDevboxSuccessResponseSchema,
  DeployDevboxErrorResponseSchema
} from '../../v2alpha/devbox/[name]/release/[tag]/deploy/schema';

import {
  SuccessResponseSchema as GetDevboxTemplatesSuccessResponseSchema,
  ErrorResponseSchema as GetDevboxTemplatesErrorResponseSchema
} from '../../v2alpha/devbox/templates/schema';

import {
  MonitorSuccessResponseSchema,
} from '../../v2alpha/devbox/[name]/monitor/schema';

import {
  GetSuccessResponseSchema as GetDeployListSuccessResponseSchema,
  ErrorResponseSchema as GetDeployListErrorResponseSchema
} from '../../v2alpha/devbox/[name]/deploy/schema';

const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.string().optional()
});

const tmpOpenApiDocument = (sealosDomain: string) =>
  createDocument({
    openapi: '3.0.0',
    info: {
      title: 'Devbox API',
      version: '1.0.0',
      description: `# Devbox API Documentation

API for managing Devbox instances with lifecycle operations, releases, and monitoring.

## Authentication
All endpoints require authentication via kubeconfig or JWT token.

## Base URLs
      - Development: http://127.0.0.1:3000/api/v2alpha
      - Production: https://devbox.{sealosDomain}/api/v2alpha

## API Organization
- Query: Read-only operations (GET requests)
- Mutation: Write operations (POST/PUT/PATCH/DELETE requests)`
    },
    tags: [
      {
        name: 'Query',
        description: 'Read-only operations for retrieving data'
      },
      {
        name: 'Mutation',
        description: 'Write operations that modify system state'
      }
    ],
    servers: [
      {
        url: `http://127.0.0.1:3000/api/v2alpha`,
        description: 'Development'
      },
      {
        url: `https://devbox.${sealosDomain}/api/v2alpha`,
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
      '/devbox': {
        get: {
          tags: ['Query'],
          summary: 'Get all devboxes',
          description: 'Retrieve list of all Devbox instances with resource and runtime information.',
          responses: {
            '200': {
              description: 'Successfully retrieved devbox list with resource allocation and runtime information.',
              content: {
                'application/json': {
                  schema: GetDevboxListResponseSchema,
                  examples: {
                    success: {
                      summary: 'Devbox list retrieved',
                      value: [
                        {
                          name: 'my-nodejs-app',
                          uid: 'abc123-def456',
                          resourceType: 'devbox',
                          runtime: 'node.js',
                          status: 'running',
                          quota: {
                            cpu: 1,
                            memory: 2
                          }
                        },
                        {
                          name: 'python-api',
                          uid: 'ghi789-jkl012',
                          resourceType: 'devbox',
                          runtime: 'python',
                          status: 'stopped',
                          quota: {
                            cpu: 2,
                            memory: 4
                          }
                        }
                      ]
                    },
                    empty_list: {
                      summary: 'No devboxes found',
                      value: []
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal Server Error - Failed to retrieve devbox list from Kubernetes or match templates.',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema,
                  examples: {
                    retrieval_failed: {
                      summary: 'Failed to get devbox list',
                      value: {
                        code: 500,
                        message: 'Internal server error',
                        data: 'Failed to list devboxes from Kubernetes'
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
          summary: 'Create new devbox',
          description: 'Create a new Devbox instance with customizable runtime, resources, and ports. CPU and memory quota must be in range [0.1, 32].',
          requestBody: {
            description: 'Devbox creation configuration including runtime, resources, ports, and environment settings',
            required: true,
            content: {
              'application/json': {
                schema: CreateDevboxRequestSchema,
                examples: {
                  basic: {
                    summary: 'Basic Devbox with Python runtime',
                    value: {
                      name: 'myda22da12da',
                      runtime: 'python',
                      quota: { cpu: 2, memory: 4 },
                      ports: [{ number: 8080, protocol: 'HTTP' }],
                      env: [{ name: 'ENV_EXAMPLE23', value: 'env_example_value23' }],
                      autostart: true
                    }
                  },
                  advanced: {
                    summary: 'Advanced Devbox with ports and environment variables (supports flexible CPU/memory values)',
                    value: {
                      name: 'my-python-api',
                      runtime: 'python',
                      quota: {
                        cpu: 1.5,
                        memory: 3.5
                      },
                      ports: [
                        {
                          number: 8000,
                          protocol: 'HTTP',
                          isPublic: true
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
                  },
                  minimal_resources: {
                    summary: 'Minimal resources (minimum values)',
                    value: {
                      name: 'my-minimal-devbox',
                      runtime: 'node.js',
                      quota: {
                        cpu: 0.1,
                        memory: 0.1
                      },
                      ports: [],
                      env: [],
                      autostart: false
                    }
                  },
                  maximum_resources: {
                    summary: 'Maximum resources (maximum values)',
                    value: {
                      name: 'my-max-devbox',
                      runtime: 'go',
                      quota: {
                        cpu: 32,
                        memory: 32
                      },
                      ports: [{ number: 8080, protocol: 'http', isPublic: true }],
                      env: [],
                      autostart: false
                    }
                  }
                }
              }
            }
          },
          responses: {
            '204': {
              description: 'Devbox created successfully. No content returned.'
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
      '/devbox/{name}': {
        get: {
          tags: ['Query'],
          summary: 'Get devbox details',
          description: 'Retrieve comprehensive details about a specific Devbox including configuration and status.',
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
              description: 'Successfully retrieved devbox details with complete configuration and status information.',
              content: {
                'application/json': {
                  schema: DevboxDetailResponseSchema,
                  examples: {
                    success: {
                      summary: 'Devbox details retrieved',
                      value: {
                        name: 'my-nodejs-app',
                        uid: 'abc123-def456-ghi789',
                        resourceType: 'devbox',
                        runtime: 'node.js',
                        image: 'ghcr.io/labring/sealos-devbox-nodejs:latest',
                        status: 'running',
                        quota: {
                          cpu: 1,
                          memory: 2
                        },
                        ssh: {
                          host: 'devbox.cloud.sealos.io',
                          port: 40001,
                          user: 'devbox',
                          workingDir: '/home/devbox/project',
                          privateKey: 'LS0tLS1CRUdJTi...'
                        },
                        env: [
                          {
                            name: 'NODE_ENV',
                            value: 'development'
                          },
                          {
                            name: 'DATABASE_URL',
                            valueFrom: {
                              secretKeyRef: {
                                name: 'my-secrets',
                                key: 'db-url'
                              }
                            }
                          }
                        ],
                        ports: [
                          {
                            number: 8080,
                            portName: 'port-abc123',
                            protocol: 'HTTP',
                            privateAddress: 'http://my-nodejs-app.ns-user123:8080',
                            publicAddress: 'https://xyz789.cloud.sealos.io',
                            customDomain: ''
                          }
                        ],
                        pods: [
                          {
                            name: 'my-nodejs-app-7d8f9b6c5d-abc12',
                            status: 'running'
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
                  schema: UpdateDevboxErrorResponseSchema,
                  examples: {
                    invalid_name: {
                      summary: 'Invalid devbox name',
                      value: {
                        code: 400,
                        message: 'Devbox name is required'
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
            '500': {
              description: 'Internal Server Error - Failed to retrieve devbox information from Kubernetes or database.',
              content: {
                'application/json': {
                  schema: UpdateDevboxErrorResponseSchema,
                  examples: {
                    retrieval_failed: {
                      summary: 'Failed to get devbox details',
                      value: {
                        code: 500,
                        message: 'Internal server error occurred while retrieving devbox details',
                        error: {
                          type: 'INTERNAL_ERROR'
                        }
                      }
                    },
                    template_not_found: {
                      summary: 'Template not found',
                      value: {
                        code: 500,
                        message: 'Template not found'
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
          summary: 'Update devbox configuration',
          description: 'Update Devbox resources and port configurations without restart. CPU and memory quota must be in range [0.1, 32].',
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
            description: 'Devbox update configuration. Specify quota and/or ports to update. At least one field is required.',
            required: true,
            content: {
              'application/json': {
                schema: UpdateDevboxRequestSchema,
                examples: {
                  quota_only: {
                    summary: 'Update resources only',
                    value: {
                      quota: {
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
                          protocol: 'http',
                          isPublic: true
                        },
                        {
                          number: 3000,
                          protocol: 'http',
                          isPublic: false
                        }
                      ]
                    }
                  },
                  both: {
                    summary: 'Update both resources and ports (supports flexible CPU/memory values)',
                    value: {
                      quota: {
                        cpu: 0.5,
                        memory: 1.0
                      },
                      ports: [
                        {
                          number: 8000,
                          protocol: 'http',
                          isPublic: true,
                          customDomain: 'api.example.com'
                        }
                      ]
                    }
                  },
                  flexible_quota: {
                    summary: 'Update with flexible quota values (any value in range [0.1, 32])',
                    value: {
                      quota: {
                        cpu: 2.5,
                        memory: 6.5
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '204': {
              description: 'Devbox updated successfully. No content returned.'
            },
            '400': {
              description: 'Bad Request - Invalid request parameters, malformed JSON, or validation errors. No content returned.'
            },
            '404': {
              description: 'Not Found - The specified Devbox does not exist in the current namespace or the port name is invalid. No content returned.'
            },
            '409': {
              description: 'Conflict - Port number is already in use by another service or resource. No content returned.'
            },
            '422': {
              description: 'Unprocessable Entity - Invalid resource configuration that exceeds limits or constraints. No content returned.'
            },
            '500': {
              description: 'Internal Server Error - Failed to update Devbox due to server-side issues. No content returned.'
            }
          }
        },
        delete: {
          tags: ['Mutation'],
          summary: 'Delete devbox',
          description: 'Delete a Devbox and all its associated resources including services, ingress, certificates, and persistent volumes.',
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
            '204': {
              description: 'Devbox deleted successfully. All associated resources have been removed. No content returned.'
            },
            '400': {
              description: 'Bad Request - Invalid devbox name format or validation error.',
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
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Not Found - The specified Devbox does not exist.',
              content: {
                'application/json': {
                  schema: UpdateDevboxErrorResponseSchema,
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
                  schema: UpdateDevboxErrorResponseSchema,
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
      '/devbox/{name}/autostart': {
        post: {
          tags: ['Mutation'],
          summary: 'Configure devbox autostart',
          description: 'Configure automatic command execution when Devbox starts with RBAC setup.',
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
            '204': {
              description: 'Autostart resources created successfully. RBAC and Job resources have been configured. No content returned.'
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
      '/devbox/{name}/start': {
        post: {
          tags: ['Mutation'],
          summary: 'Start devbox',
          description: 'Start a paused or stopped Devbox and restore its services to active state.',
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
            '204': {
              description: 'Devbox started successfully. Pods are starting and ingress has been restored. No content returned.'
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
      '/devbox/{name}/pause': {
        post: {
          tags: ['Mutation'],
          summary: 'Pause devbox',
          description: 'Temporarily pause a Devbox while maintaining port allocations to reduce costs.',
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
            '204': {
              description: 'Devbox paused successfully. Compute resources stopped, ports maintained. No content returned.'
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
      '/devbox/{name}/shutdown': {
        post: {
          tags: ['Mutation'],
          summary: 'Shutdown devbox',
          description: 'Completely shutdown a Devbox and release all port allocations to minimize costs.',
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
            '204': {
              description: 'Devbox shutdown successfully. All compute resources and ports have been released. No content returned.'
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
      '/devbox/{name}/restart': {
        post: {
          tags: ['Mutation'],
          summary: 'Restart devbox',
          description: 'Perform a complete restart cycle of a Devbox for configuration changes or error recovery.',
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
            '204': {
              description: 'Devbox restarted successfully. Complete restart cycle completed with all services restored. No content returned.'
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
      '/devbox/{name}/release': {
        get: {
          tags: ['Query'],
          summary: 'Get devbox releases',
          description: 'Retrieve all release versions for a specific Devbox with version history and status.',
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
                      value: [
                        {
                          id: 'release-123-abc',
                          name: 'my-devbox-v1.0.0',
                          devboxName: 'my-devbox',
                          createdAt: '2024-01-15 10:30',
                          tag: 'v1.0.0',
                          description: 'First stable release',
                          image: 'registry.cloud.sealos.io/ns-user123/my-devbox:v1.0.0'
                        },
                        {
                          id: 'release-456-def',
                          name: 'my-devbox-v0.9.0',
                          devboxName: 'my-devbox',
                          createdAt: '2024-01-10 09:15',
                          tag: 'v0.9.0',
                          description: 'Beta release',
                          image: 'registry.cloud.sealos.io/ns-user123/my-devbox:v0.9.0'
                        }
                      ]
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
          summary: 'Create devbox release',
          description: 'Create a new release version by snapshotting current Devbox state and building container image.',
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
            '204': {
              description: 'Devbox release created successfully. Image building process has started. No content returned.'
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
      '/devbox/{name}/deploy': {
        get: {
          tags: ['Query'],
          summary: 'Get deployed releases',
          description: 'Retrieve all deployed applications from this devbox releases on AppLaunchpad.',
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
              description: 'Successfully retrieved list of deployed applications from this devbox.',
              content: {
                'application/json': {
                  schema: GetDeployListSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'Deployed releases retrieved',
                      value: [
                        {
                          name: 'my-devbox-v1-0-0',
                          resourceType: 'deployment',
                          tag: 'v1.0.0'
                        },
                        {
                          name: 'my-devbox-v0-9-0',
                          resourceType: 'statefulset',
                          tag: 'v0.9.0'
                        }
                      ]
                    },
                    empty_list: {
                      summary: 'No deployments found',
                      value: []
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad Request - Invalid devbox name format.',
              content: {
                'application/json': {
                  schema: GetDeployListErrorResponseSchema,
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
              description: 'Internal Server Error - Failed to query Kubernetes resources.',
              content: {
                'application/json': {
                  schema: GetDeployListErrorResponseSchema,
                  examples: {
                    query_failed: {
                      summary: 'Failed to query deployments',
                      value: {
                        code: 500,
                        message: 'Internal server error',
                        error: 'Failed to list Kubernetes resources'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/devbox/{name}/release/{tag}': {
        delete: {
          tags: ['Mutation'],
          summary: 'Delete devbox release',
          description: 'Delete a specific release version and its associated container image.',
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
            '204': {
              description: 'Release deleted successfully. The release and its container image have been removed. No content returned.'
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
      '/devbox/{name}/release/{tag}/deploy': {
        post: {
          tags: ['Mutation'],
          summary: 'Deploy devbox release',
          description: 'Deploy a release version to AppLaunchpad as a production application.',
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
            '204': {
              description: 'Devbox release deployed successfully to AppLaunchpad. Application is now running in production. No content returned.'
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
      '/devbox/{name}/monitor': {
        get: {
          tags: ['Query'],
          summary: 'Get devbox monitoring',
          description: 'Retrieve time-series monitoring data for CPU and memory usage of a specific Devbox.',
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
              name: 'start',
              in: 'query',
              required: false,
              description: 'Start timestamp in milliseconds',
              schema: {
                type: 'string',
                example: '1697356680000'
              }
            },
            {
              name: 'end',
              in: 'query',
              required: false,
              description: 'End timestamp in milliseconds',
              schema: {
                type: 'string',
                example: '1697360280000'
              }
            },
            {
              name: 'step',
              in: 'query',
              required: false,
              description: 'Data sampling step interval (e.g., "1m", "5m", "1h")',
              schema: {
                type: 'string',
                default: '2m',
                example: '2m'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Successfully retrieved monitoring data with CPU and memory usage metrics.',
              content: {
                'application/json': {
                  schema: MonitorSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'Monitor data retrieved',
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
                        },
                        {
                          timestamp: 1760510400,
                          readableTime: '2025/10/15 14:40',
                          cpu: 1.25,
                          memory: 10.45
                        }
                      ]
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad Request - Invalid devbox name or missing required parameters.',
              content: {
                'application/json': {
                  schema: MonitorSuccessResponseSchema,
                  examples: {
                    invalid_name: {
                      summary: 'Invalid or missing devbox name',
                      value: []
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal Server Error - Failed to fetch monitoring data from monitoring service.',
              content: {
                'application/json': {
                  schema: MonitorSuccessResponseSchema,
                  examples: {
                    fetch_failed: {
                      summary: 'Failed to fetch monitor data',
                      value: []
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
          summary: 'Get devbox templates',
          description: 'Retrieve available runtime environments and template configurations for creating Devboxes.',
          responses: {
            '200': {
              description: 'Successfully retrieved devbox templates. Returns array of { runtime, config }.',
              content: {
                'application/json': {
                  schema: GetDevboxTemplatesSuccessResponseSchema,
                  examples: {
                    success: {
                      summary: 'Templates retrieved',
                      value: [
                        {
                          runtime: 'mcp',
                          config: {
                            appPorts: [
                              {
                                name: 'devbox-app-port',
                                port: 8080,
                                protocol: 'TCP'
                              }
                            ],
                            ports: [
                              {
                                containerPort: 22,
                                name: 'devbox-ssh-port',
                                protocol: 'TCP'
                              }
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
                            appPorts: [
                              {
                                name: 'devbox-app-port',
                                port: 8080,
                                protocol: 'TCP'
                              }
                            ],
                            ports: [
                              {
                                containerPort: 22,
                                name: 'devbox-ssh-port',
                                protocol: 'TCP'
                              }
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