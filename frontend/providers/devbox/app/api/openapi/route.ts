import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import {
  RequestSchema as DelDevboxRequestSchema,
  SuccessResponseSchema as DelDevboxSuccessResponseSchema,
  ErrorResponseSchema as DelDevboxErrorResponseSchema
} from '../v1/devbox/delete/schema';

import {
  RequestSchema as CreateDevboxPortRequestSchema,
  SuccessResponseSchema as CreateDevboxPortSuccessResponseSchema,
  ErrorResponseSchema as CreateDevboxPortErrorResponseSchema
} from '../v1/devbox/ports/create/schema';
import {
  RequestSchema as ReleaseDevboxRequestSchema,
  SuccessResponseSchema as ReleaseDevboxSuccessResponseSchema,
  ErrorResponseSchema as ReleaseDevboxErrorResponseSchema
} from '../v1/devbox/release/schema';
import {
  RequestSchema as GetDevboxVersionListRequestSchema,
  SuccessResponseSchema as GetDevboxVersionListSuccessResponseSchema,
  ErrorResponseSchema as GetDevboxVersionListErrorResponseSchema
} from '../v1/devbox/releases/schema';
import {
  DeployDevboxRequestSchema,
  DeployDevboxSuccessResponseSchema,
  DeployDevboxErrorResponseSchema
} from '../deployDevbox/schema';
import {
  RequestSchema as GetDevboxByNameRequestSchema,
  SuccessResponseSchema as GetDevboxByNameSuccessResponseSchema,
  ErrorResponseSchema as GetDevboxByNameErrorResponseSchema
} from '../v1/devbox/get/schema';
import { ResponseSchema as GetDevboxListResponseSchema } from '../v1/devbox/list/schema';
import {
  RequestSchema as RemoveDevboxPortRequestSchema,
  SuccessResponseSchema as RemoveDevboxPortSuccessResponseSchema,
  ErrorResponseSchema as RemoveDevboxPortErrorResponseSchema
} from '../v1/devbox/ports/remove/schema';
import {
  RequestSchema as CreateSimpleDevboxRequestSchema,
  SuccessResponseSchema as CreateSimpleDevboxSuccessResponseSchema
} from '../v1/devbox/create/schema';
import {
  RequestSchema as LifecycleDevboxRequestSchema,
  SuccessResponseSchema as LifecycleDevboxSuccessResponseSchema,
  ErrorResponseSchema as LifecycleDevboxErrorResponseSchema
} from '../v1/devbox/lifecycle/schema';
import {
  RequestSchema as CreateDevboxRequestSchema,
  SuccessResponseSchema as CreateDevboxSuccessResponseSchema
} from '../v1/devbox/schema';

import {
  UpdateDevboxRequestSchema,
  UpdateDevboxResponseSchema,
  ErrorResponseSchema as MergedDevboxErrorResponseSchema
} from '../v1/devbox/[name]/schema';

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
  UpdatePortsRequestSchema,
  UpdatePortsResponseSchema,
  ErrorResponseSchema as PortsErrorResponseSchema
} from '../v1/devbox/[name]/ports/schema';
import {
  RequestSchema as ReleaseDevboxRequestSchema2,
  SuccessResponseSchema as ReleaseDevboxSuccessResponseSchema2,
  ErrorResponseSchema as ReleaseDevboxErrorResponseSchema2,
  GetSuccessResponseSchema as ReleaseDevboxGetSuccessResponseSchema2
} from '../v1/devbox/[name]/release/schema';
import {
  DeployDevboxPathParamsSchema as DeployDevboxPathParamsSchema2,
  DeployDevboxRequestSchema as DeployDevboxRequestSchema2,
  DeployDevboxSuccessResponseSchema as DeployDevboxSuccessResponseSchema2,
  DeployDevboxErrorResponseSchema as DeployDevboxErrorResponseSchema2 
} from '../v1/devbox/[name]/release/[tag]/deploy/schema';

import {
  RequestSchema as DeleteDevboxByNameRequestSchema,
  SuccessResponseSchema as DeleteDevboxByNameSuccessResponseSchema,
  ErrorResponseSchema as DeleteDevboxByNameErrorResponseSchema
} from '../v1/devbox/[name]/delete/schema';

import {
  SuccessResponseSchema as DeleteReleaseSuccessResponseSchema,
  ErrorResponseSchema as DeleteReleaseErrorResponseSchema
} from '../v1/devbox/[name]/release/[tag]/schema';

import { NextResponse } from 'next/server';
import { getToolsList } from 'sealos-mcp-sdk';
import path from 'path';

import {
  SuccessResponseSchema as GetDevboxConfigSuccessResponseSchema,
  ErrorResponseSchema as GetDevboxConfigErrorResponseSchema
} from '../v1/devbox/templates/schema';

const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.string().optional()
});

// generate openapi document
const tmpOpenApiDocument = (sealosDomain: string, mcpTool: string) =>
  createDocument({
    openapi: '3.0.0',
    info: {
      title: 'Devbox API',
      version: '1.0.0',
      description: mcpTool
    },
    tags: [
      {
        name: 'Lifecycle',
        description: 'Devbox lifecycle management operations'
      },
      {
        name: 'Release',
        description: 'Devbox release management and deployment'
      },
      {
        name: 'Query',
        description: 'Devbox information retrieval operations'
      },
      {
        name: 'Runtime',
        description: 'Devbox Runtime management'
      },
      {
        name: 'Port',
        description: 'Devbox port management'
      },
      {
        name: 'Application',
        description:
          'Application management,you need change baseUrl to application.{{sealosDomain}}, not devbox.{{sealosDomain}}'
      }
    ],
    'x-tagGroups': [
      {
        name: 'API',
        tags: ['Lifecycle', 'Release', 'Query', 'Runtime', 'Port', 'Application']
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
      '/api/deployDevbox': {
        post: {
          tags: ['Release'],
          summary: 'Deploy a devbox',
          description: 'Deploy a devbox',
          requestBody: {
            content: {
              'application/json': {
                schema: DeployDevboxRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox deployed successfully',
              content: {
                'application/json': {
                  schema: DeployDevboxSuccessResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/create': {
        post: {
          tags: ['Lifecycle'],
          summary: 'Create a new devbox with a simple runtime',
          description:
            'Create a new devbox, you need to use the /api/templateRepository/listOfficial interface to get the runtime list before using this interface, for the requestBody templateRepositoryUid; you need to use the /api/templateRepository/template/list interface to get the specific version list of the runtime, for the requestBody templateUid, templateConfig and image',
          requestBody: {
            content: {
              'application/json': {
                schema: CreateSimpleDevboxRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox created successfully',
              content: {
                'application/json': {
                  schema: CreateSimpleDevboxSuccessResponseSchema
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
            '404': {
              description: 'Template not found',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            },
            '409': {
              description: 'Devbox already exists',
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
      '/api/v1/devbox': {
        post: {
          tags: ['Lifecycle'],
          summary: 'Create a new devbox with runtime and port configuration',
          description: 'Create a new devbox with specified runtime environment, resource allocation, and optional port configurations. Supports custom port settings with public domain access.',
          requestBody: {
            content: {
              'application/json': {
                schema: CreateDevboxRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox created successfully',
              content: {
                'application/json': {
                  schema: CreateDevboxSuccessResponseSchema
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
            '404': {
              description: 'Runtime not found',
              content: {
                'application/json': {
                  schema: ErrorResponseSchema
                }
              }
            },
            '409': {
              description: 'Devbox already exists',
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
      '/api/v1/devbox/{name}': {
        patch: {
          tags: ['Lifecycle'],
          summary: 'Update devbox configuration',
          description: 'Update devbox resource allocation (CPU and memory) and/or port configurations. Can update resources only, ports only, or both simultaneously. For ports: include portName to update existing ports, exclude portName to create new ports. Existing ports not included will be deleted.',
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
            content: {
              'application/json': {
                schema: UpdateDevboxRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox updated successfully',
              content: {
                'application/json': {
                  schema: UpdateDevboxResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid request body or devbox name',
              content: {
                'application/json': {
                  schema: MergedDevboxErrorResponseSchema
                }
              }
            },
            '404': {
              description: 'Devbox not found',
              content: {
                'application/json': {
                  schema: MergedDevboxErrorResponseSchema
                }
              }
            },
            '409': {
              description: 'Port conflict - port number already in use',
              content: {
                'application/json': {
                  schema: MergedDevboxErrorResponseSchema
                }
              }
            },
            '422': {
              description: 'Invalid resource configuration',
              content: {
                'application/json': {
                  schema: MergedDevboxErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: MergedDevboxErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/{name}/delete': {
      delete: {
        tags: ['Lifecycle'],
        summary: 'Delete a devbox by name',
        description: 'Delete a devbox and its associated resources (service, ingress, certificates, etc.) using the devbox name as a path parameter',
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
            description: 'Devbox deleted successfully',
            content: {
              'application/json': {
                schema: DeleteDevboxByNameSuccessResponseSchema
              }
            }
          },
          '400': {
            description: 'Invalid devbox name',
            content: {
              'application/json': {
                schema: DeleteDevboxByNameErrorResponseSchema
              }
            }
          },
          '404': {
            description: 'Devbox not found',
            content: {
              'application/json': {
                schema: DeleteDevboxByNameErrorResponseSchema
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: DeleteDevboxByNameErrorResponseSchema
              }
            }
          }
        }
      }
    },
      '/api/v1/devbox/{name}/start': {
      post: {
        tags: ['Lifecycle'],
        summary: 'Start a devbox',
        description: 'Start a devbox by name. This will set the devbox state to Running and restore ingress configurations from pause to nginx.',
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
          content: {
            'application/json': {
              schema: StartDevboxRequestSchema
            }
          }
        },
        responses: {
          '200': {
            description: 'Devbox started successfully',
            content: {
              'application/json': {
                schema: StartDevboxSuccessResponseSchema
              }
            }
          },
          '400': {
            description: 'Invalid request body or devbox name',
            content: {
              'application/json': {
                schema: StartDevboxErrorResponseSchema
              }
            }
          },
          '404': {
            description: 'Devbox not found',
            content: {
              'application/json': {
                schema: StartDevboxErrorResponseSchema
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: StartDevboxErrorResponseSchema
              }
            }
          }
        }
      }
    },
'/api/v1/devbox/{name}/pause': {
  post: {
    tags: ['Lifecycle'],
    summary: 'Pause a devbox',
    description: 'Pause a devbox by name. This will set the devbox state to Stopped and change ingress configurations from nginx to pause. The devbox will be paused but ports will still be maintained (with small port fees).',
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
      content: {
        'application/json': {
          schema: PauseDevboxRequestSchema
        }
      }
    },
    responses: {
      '200': {
        description: 'Devbox paused successfully',
        content: {
          'application/json': {
            schema: PauseDevboxSuccessResponseSchema
          }
        }
      },
      '400': {
        description: 'Invalid request body or devbox name',
        content: {
          'application/json': {
            schema: PauseDevboxErrorResponseSchema
          }
        }
      },
      '404': {
        description: 'Devbox not found',
        content: {
          'application/json': {
            schema: PauseDevboxErrorResponseSchema
          }
        }
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: PauseDevboxErrorResponseSchema
          }
        }
      }
    }
  }
},
'/api/v1/devbox/{name}/shutdown': {
  post: {
    tags: ['Lifecycle'],
    summary: 'Shutdown a devbox',
    description: 'Shutdown a devbox by name. This will set the devbox state to Shutdown and change ingress configurations from nginx to pause. The devbox will be shut down and ports will be released (no port fees).',
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
      content: {
        'application/json': {
          schema: ShutdownDevboxRequestSchema
        }
      }
    },
    responses: {
      '200': {
        description: 'Devbox shutdown successfully',
        content: {
          'application/json': {
            schema: ShutdownDevboxSuccessResponseSchema
          }
        }
      },
      '400': {
        description: 'Invalid request body or devbox name',
        content: {
          'application/json': {
            schema: ShutdownDevboxErrorResponseSchema
          }
        }
      },
      '404': {
        description: 'Devbox not found',
        content: {
          'application/json': {
            schema: ShutdownDevboxErrorResponseSchema
          }
        }
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: ShutdownDevboxErrorResponseSchema
          }
        }
      }
    }
  }
},
'/api/v1/devbox/{name}/restart': {
  post: {
    tags: ['Lifecycle'],
    summary: 'Restart a devbox',
    description: 'Restart a devbox by name. This will perform a complete restart cycle: stop the devbox, wait for pods to be deleted, restore ingress configurations, and start the devbox again.',
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
      content: {
        'application/json': {
          schema: RestartDevboxRequestSchema
        }
      }
    },
    responses: {
      '200': {
        description: 'Devbox restarted successfully',
        content: {
          'application/json': {
            schema: RestartDevboxSuccessResponseSchema
          }
        }
      },
      '400': {
        description: 'Invalid request body or devbox name',
        content: {
          'application/json': {
            schema: RestartDevboxErrorResponseSchema
          }
        }
      },
      '404': {
        description: 'Devbox not found',
        content: {
          'application/json': {
            schema: RestartDevboxErrorResponseSchema
          }
        }
      },
      '408': {
        description: 'Restart timeout - pods did not delete within expected time',
        content: {
          'application/json': {
            schema: RestartDevboxErrorResponseSchema
          }
        }
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: RestartDevboxErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/{name}/ports': {
        put: {
          tags: ['Port'],
          summary: 'Update devbox port configurations',
          description: 'Update, create, or delete port configurations for a devbox. Include portName to update existing ports, exclude portName to create new ports. Existing ports not included in the request will be deleted.',
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
            content: {
              'application/json': {
                schema: UpdatePortsRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'DevBox ports updated successfully',
              content: {
                'application/json': {
                  schema: UpdatePortsResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid request body or devbox name',
              content: {
                'application/json': {
                  schema: PortsErrorResponseSchema
                }
              }
            },
            '404': {
              description: 'Devbox not found',
              content: {
                'application/json': {
                  schema: PortsErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: PortsErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/{name}/release': {
        get: {
          tags: ['Release'],
          summary: 'Get devbox release list by name',
          description: 'Retrieve all release versions for a specific devbox by name. Returns a list of all releases including their status, creation time, tags, and image addresses.',
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
              description: 'Successfully retrieved devbox release list',
              content: {
                'application/json': {
                  schema: ReleaseDevboxGetSuccessResponseSchema2
                }
              }
            },
            '400': {
              description: 'Invalid devbox name format',
              content: {
                'application/json': {
                  schema: DeleteReleaseErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: DeleteReleaseErrorResponseSchema
                }
              }
            }
          }
        },
        post: {
          tags: ['Release'],
          summary: 'Release a specific devbox version',
          description: 'Create a new release for a specific devbox by name with a tag and optional description. This endpoint creates a DevboxRelease resource and generates a container image. The devbox should be stopped before releasing.',
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
            content: {
              'application/json': {
                schema: ReleaseDevboxRequestSchema2
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox release created successfully',
              content: {
                'application/json': {
                  schema: ReleaseDevboxSuccessResponseSchema2
                }
              }
            },
            '400': {
              description: 'Invalid request body or devbox name format',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema2
                }
              }
            },
            '404': {
              description: 'Devbox not found',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema2
                }
              }
            },
            '409': {
              description: 'Devbox release with this tag already exists',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema2
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema2
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/{name}/release/{tag}': {
      delete: {
        tags: ['Release'],
        summary: 'Delete a specific devbox release',
        description: 'Delete a specific release of a devbox by its name and release name. This will remove the DevboxRelease resource from Kubernetes and associated container image.',
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
            description: 'Release deleted successfully',
            content: {
              'application/json': {
                schema: DeleteReleaseSuccessResponseSchema
              }
            }
          },
          '400': {
            description: 'Invalid devbox name or release name format',
            content: {
              'application/json': {
                schema: ErrorResponseSchema
              }
            }
          },
          '404': {
            description: 'Release not found',
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
      '/api/v1/devbox/{name}/release/{tag}/deploy': {
        post: {
          tags: ['Release'],
          summary: 'Deploy a specific devbox release version',
          description: 'Deploy a specific devbox release to applaunchpad with fixed resource configuration (2 CPU cores, 2GB memory). The devbox release must exist and be in Success status before deployment.',
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
            content: {
              'application/json': {
                schema: DeployDevboxRequestSchema2
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox release deployed successfully to applaunchpad',
              content: {
                'application/json': {
                  schema: DeployDevboxSuccessResponseSchema2
                }
              }
            },
            '400': {
              description: 'Invalid request body or path parameters',
              content: {
                'application/json': {
                  schema: DeployDevboxErrorResponseSchema2
                }
              }
            },
            '404': {
              description: 'Devbox or release tag not found',
              content: {
                'application/json': {
                  schema: DeployDevboxErrorResponseSchema2
                }
              }
            },
            '500': {
              description: 'Internal server error or deployment failed',
              content: {
                'application/json': {
                  schema: DeployDevboxErrorResponseSchema2
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/lifecycle': {
        post: {
          tags: ['Lifecycle'],
          summary: 'Lifecycle a devbox',
          description: 'Lifecycle a devbox',
          requestBody: {
            content: {
              'application/json': {
                schema: LifecycleDevboxRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox lifecycle updated successfully',
              content: {
                'application/json': {
                  schema: LifecycleDevboxSuccessResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid request body',
              content: {
                'application/json': {
                  schema: LifecycleDevboxErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/release': {
        post: {
          tags: ['Release'],
          summary: 'Release a devbox version',
          description:
            'Create a new release for an existing devbox with a specific tag and description. You can use the /api/v1/getDevboxVersionListDefault interface to get the devbox version list. Since the release process takes a long time, this interface will not return any data. Please use the /api/v1/getDevboxVersionListDefault interface to check the release status.Beside,you need to stopped the devbox(stopped is ok,no need to shutdown) before releasing it.',
          requestBody: {
            content: {
              'application/json': {
                schema: ReleaseDevboxRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox release created successfully',
              content: {
                'application/json': {
                  schema: ReleaseDevboxSuccessResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid request body',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema
                }
              }
            },
            '409': {
              description: 'Devbox release already exists',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: ReleaseDevboxErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/delete': {
        delete: {
          tags: ['Lifecycle'],
          summary: 'Delete a devbox',
          description: 'Delete a devbox and its associated resources (service, ingress, etc.)',
          requestParams: {
            query: DelDevboxRequestSchema
          },
          responses: {
            '200': {
              description: 'Devbox deleted successfully',
              content: {
                'application/json': {
                  schema: DelDevboxSuccessResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid request parameters',
              content: {
                'application/json': {
                  schema: DelDevboxErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: DelDevboxErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/ports/create': {
        post: {
          tags: ['Port'],
          summary: 'Create a new devbox port',
          description:
            'Create a new devbox port,if the port is already exists,it will return the port information directly',
          requestBody: {
            content: {
              'application/json': {
                schema: CreateDevboxPortRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Successfully created devbox port',
              content: {
                'application/json': {
                  schema: CreateDevboxPortSuccessResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid request body',
              content: {
                'application/json': {
                  schema: CreateDevboxPortErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: CreateDevboxPortErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/ports/remove': {
        post: {
          tags: ['Port'],
          summary: 'Remove a devbox port',
          description: 'Remove a port from devbox and delete its associated ingress',
          requestBody: {
            content: {
              'application/json': {
                schema: RemoveDevboxPortRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Successfully removed devbox port',
              content: {
                'application/json': {
                  schema: RemoveDevboxPortSuccessResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid request body',
              content: {
                'application/json': {
                  schema: RemoveDevboxPortErrorResponseSchema
                }
              }
            },
            '404': {
              description: 'Service or port not found',
              content: {
                'application/json': {
                  schema: RemoveDevboxPortErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: RemoveDevboxPortErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/releases': {
        get: {
          tags: ['Release'],
          summary: 'Get devbox release list',
          description:
            'Get all versions of a specific devbox,you need to use the /api/getDevboxByName interface to get the devbox uid',
          requestParams: {
            query: GetDevboxVersionListRequestSchema
          },
          responses: {
            '200': {
              description: 'Successfully retrieved devbox version list',
              content: {
                'application/json': {
                  schema: GetDevboxVersionListSuccessResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid request parameters',
              content: {
                'application/json': {
                  schema: GetDevboxVersionListErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: GetDevboxVersionListErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/devbox/get': {
        get: {
          tags: ['Query'],
          summary: 'Get devbox by name',
          description: 'Get detailed information about a specific devbox by its name',
          requestParams: {
            query: GetDevboxByNameRequestSchema
          },
          responses: {
            '200': {
              description: 'Successfully retrieved devbox information',
              content: {
                'application/json': {
                  schema: GetDevboxByNameSuccessResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid request parameters',
              content: {
                'application/json': {
                  schema: GetDevboxByNameErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: GetDevboxByNameErrorResponseSchema
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
          description: 'Retrieve available runtimes and template configurations for creating devboxes. Returns a list of accessible template repositories and their associated template configurations.',
          responses: {
            '200': {
              description: 'Successfully retrieved devbox configuration',
              content: {
                'application/json': {
                  schema: GetDevboxConfigSuccessResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: GetDevboxConfigErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/v1/DevBox/list': {
        get: {
          tags: ['Query'],
          summary: 'Get devbox list',
          description: 'Get all devboxes in the current namespace',
          responses: {
            '200': {
              description: 'Successfully retrieved devbox list',
              content: {
                'application/json': {
                  schema: GetDevboxListResponseSchema
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

const applaunchpadDocument = {
  '/api/v1alpha/createApp': {
    post: {
      tags: ['Application'],
      summary: 'Create a new application',
      description: 'Create a new application with the specified configuration',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                appForm: {
                  type: 'object',
                  properties: {
                    appName: {
                      type: 'string',
                      default: 'hello-world'
                    },
                    imageName: {
                      type: 'string',
                      default: 'nginx'
                    },
                    runCMD: {
                      type: 'string',
                      default: ''
                    },
                    cmdParam: {
                      type: 'string',
                      default: ''
                    },
                    replicas: {
                      anyOf: [
                        {
                          type: 'number'
                        },
                        {
                          type: 'string',
                          enum: ['']
                        }
                      ],
                      default: 1
                    },
                    cpu: {
                      type: 'number',
                      default: 200
                    },
                    memory: {
                      type: 'number',
                      default: 256
                    },
                    gpu: {
                      type: 'object',
                      properties: {
                        manufacturers: {
                          type: 'string',
                          default: 'nvidia'
                        },
                        type: {
                          type: 'string',
                          default: ''
                        },
                        amount: {
                          type: 'number',
                          default: 1
                        }
                      }
                    },
                    networks: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          networkName: {
                            type: 'string',
                            default: ''
                          },
                          portName: {
                            type: 'string',
                            default: 'agbsrpjnhuxc'
                          },
                          port: {
                            type: 'number',
                            default: 80
                          },
                          protocol: {
                            type: 'string',
                            enum: ['TCP', 'UDP', 'SCTP'],
                            default: 'TCP'
                          },
                          appProtocol: {
                            type: 'string',
                            enum: ['HTTP', 'GRPC', 'WS'],
                            default: 'HTTP'
                          },
                          openPublicDomain: {
                            type: 'boolean',
                            default: false
                          },
                          publicDomain: {
                            type: 'string',
                            default: ''
                          },
                          customDomain: {
                            type: 'string',
                            default: ''
                          },
                          domain: {
                            type: 'string',
                            default: ''
                          },
                          nodePort: {
                            type: 'number'
                          },
                          openNodePort: {
                            type: 'boolean',
                            default: false
                          }
                        }
                      },
                      default: [
                        {
                          networkName: '',
                          portName: 'hxohddqzhfce',
                          port: 80,
                          protocol: 'TCP',
                          appProtocol: 'HTTP',
                          openPublicDomain: false,
                          openNodePort: false,
                          publicDomain: '',
                          customDomain: '',
                          domain: ''
                        }
                      ]
                    },
                    envs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          key: {
                            type: 'string'
                          },
                          value: {
                            type: 'string'
                          },
                          valueFrom: {}
                        },
                        required: ['key', 'value']
                      },
                      default: []
                    },
                    hpa: {
                      type: 'object',
                      properties: {
                        use: {
                          type: 'boolean',
                          default: false
                        },
                        target: {
                          type: 'string',
                          enum: ['cpu', 'memory', 'gpu'],
                          default: 'cpu'
                        },
                        value: {
                          type: 'number',
                          default: 50
                        },
                        minReplicas: {
                          type: 'number',
                          default: 1
                        },
                        maxReplicas: {
                          type: 'number',
                          default: 5
                        }
                      }
                    },
                    secret: {
                      type: 'object',
                      properties: {
                        use: {
                          type: 'boolean',
                          default: false
                        },
                        username: {
                          type: 'string',
                          default: ''
                        },
                        password: {
                          type: 'string',
                          default: ''
                        },
                        serverAddress: {
                          type: 'string',
                          default: 'docker.io'
                        }
                      }
                    },
                    configMapList: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          mountPath: {
                            type: 'string'
                          },
                          value: {
                            type: 'string'
                          }
                        },
                        required: ['mountPath', 'value']
                      },
                      default: []
                    },
                    storeList: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string'
                          },
                          path: {
                            type: 'string'
                          },
                          value: {
                            type: 'number'
                          }
                        },
                        required: ['name', 'path', 'value']
                      },
                      default: []
                    },
                    labels: {
                      type: 'object',
                      additionalProperties: {
                        type: 'string'
                      },
                      default: {}
                    },
                    volumes: {
                      type: 'array',
                      items: {},
                      default: []
                    },
                    volumeMounts: {
                      type: 'array',
                      items: {},
                      default: []
                    },
                    kind: {
                      type: 'string',
                      enum: ['deployment', 'statefulset'],
                      default: 'deployment'
                    }
                  },
                  required: ['hpa', 'secret']
                }
              },
              required: ['appForm']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Application created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'string',
                    default: 'success'
                  }
                },
                required: ['data']
              }
            }
          }
        },
        '400': {
          description: 'Invalid request body',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'number'
                  },
                  message: {
                    type: 'string'
                  },
                  data: {
                    type: 'string'
                  }
                },
                required: ['code', 'message']
              }
            }
          }
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'number'
                  },
                  message: {
                    type: 'string'
                  },
                  data: {
                    type: 'string'
                  }
                },
                required: ['code', 'message']
              }
            }
          }
        }
      }
    }
  },
  '/api/v1alpha/getApps': {
    get: {
      tags: ['Application'],
      summary: 'Get all applications',
      description: 'Retrieve a list of all applications for the current user',
      responses: {
        '200': {
          description: 'Applications list retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string'
                        },
                        name: {
                          type: 'string'
                        },
                        status: {
                          type: 'object',
                          properties: {
                            label: {
                              type: 'string'
                            },
                            value: {
                              type: 'string'
                            },
                            color: {
                              type: 'string'
                            },
                            backgroundColor: {
                              type: 'string'
                            },
                            dotColor: {
                              type: 'string'
                            }
                          },
                          required: ['label', 'value', 'color', 'backgroundColor', 'dotColor']
                        },
                        isPause: {
                          type: 'boolean'
                        },
                        createTime: {
                          type: 'string'
                        },
                        cpu: {
                          type: 'number'
                        },
                        memory: {
                          type: 'number'
                        },
                        gpu: {
                          type: 'object',
                          properties: {
                            manufacturers: {
                              type: 'string'
                            },
                            type: {
                              type: 'string'
                            },
                            amount: {
                              type: 'number'
                            }
                          },
                          required: ['manufacturers', 'type', 'amount']
                        },
                        usedCpu: {
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string'
                            },
                            xData: {
                              type: 'array',
                              items: {
                                type: 'number'
                              }
                            },
                            yData: {
                              type: 'array',
                              items: {
                                type: 'string'
                              }
                            }
                          },
                          required: ['xData', 'yData']
                        },
                        usedMemory: {
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string'
                            },
                            xData: {
                              type: 'array',
                              items: {
                                type: 'number'
                              }
                            },
                            yData: {
                              type: 'array',
                              items: {
                                type: 'string'
                              }
                            }
                          },
                          required: ['xData', 'yData']
                        },
                        activeReplicas: {
                          type: 'number'
                        },
                        minReplicas: {
                          type: 'number'
                        },
                        maxReplicas: {
                          type: 'number'
                        },
                        storeAmount: {
                          type: 'number'
                        },
                        labels: {
                          type: 'object',
                          additionalProperties: {
                            type: 'string'
                          }
                        },
                        source: {
                          type: 'object',
                          properties: {
                            hasSource: {
                              type: 'boolean'
                            },
                            sourceName: {
                              type: 'string'
                            },
                            sourceType: {
                              type: 'string'
                            }
                          },
                          required: ['hasSource', 'sourceName', 'sourceType']
                        }
                      },
                      required: [
                        'id',
                        'name',
                        'status',
                        'isPause',
                        'createTime',
                        'cpu',
                        'memory',
                        'usedCpu',
                        'usedMemory',
                        'activeReplicas',
                        'minReplicas',
                        'maxReplicas',
                        'storeAmount',
                        'labels',
                        'source'
                      ]
                    }
                  }
                },
                required: ['data']
              }
            }
          }
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'number'
                  },
                  message: {
                    type: 'string'
                  },
                  data: {
                    type: 'string'
                  }
                },
                required: ['code', 'message']
              }
            }
          }
        }
      }
    }
  },
  '/api/v1alpha/getAppByAppName': {
    get: {
      tags: ['Application'],
      summary: 'Get application by name',
      description: 'Retrieve application details by application name',
      parameters: [
        {
          name: 'appName',
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
          description: 'Application details retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    nullable: true,
                    items: {}
                  }
                },
                required: ['data']
              }
            }
          }
        },
        '400': {
          description: 'Invalid query parameters',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'number'
                  },
                  message: {
                    type: 'string'
                  },
                  data: {
                    type: 'string'
                  }
                },
                required: ['code', 'message']
              }
            }
          }
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'number'
                  },
                  message: {
                    type: 'string'
                  },
                  data: {
                    type: 'string'
                  }
                },
                required: ['code', 'message']
              }
            }
          }
        }
      }
    }
  },
  '/api/v1alpha/delAppByName': {
    delete: {
      tags: ['Application'],
      summary: 'Delete application',
      description: 'Delete an application by its name',
      parameters: [
        {
          name: 'name',
          in: 'query',
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
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string'
                  }
                },
                required: ['message']
              }
            }
          }
        },
        '400': {
          description: 'Invalid query parameters',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'number'
                  },
                  message: {
                    type: 'string'
                  },
                  data: {
                    type: 'string'
                  }
                },
                required: ['code', 'message']
              }
            }
          }
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'number'
                  },
                  message: {
                    type: 'string'
                  },
                  data: {
                    type: 'string'
                  }
                },
                required: ['code', 'message']
              }
            }
          }
        }
      }
    }
  },
  '/api/v1alpha/getAppPodsByAppName': {
    get: {
      tags: ['Application'],
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
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      allOf: [
                        {
                          type: 'object',
                          properties: {
                            podName: {
                              type: 'string'
                            },
                            status: {
                              type: 'object',
                              properties: {
                                label: {
                                  type: 'string'
                                },
                                value: {
                                  type: 'string'
                                },
                                color: {
                                  type: 'string'
                                },
                                reason: {
                                  type: 'string'
                                },
                                message: {
                                  type: 'string'
                                }
                              },
                              required: ['label', 'value', 'color']
                            },
                            nodeName: {
                              type: 'string'
                            },
                            ip: {
                              type: 'string'
                            },
                            restarts: {
                              type: 'number'
                            },
                            age: {
                              type: 'string'
                            },
                            usedCpu: {
                              type: 'object',
                              properties: {
                                name: {
                                  type: 'string'
                                },
                                xData: {
                                  type: 'array',
                                  items: {
                                    type: 'number'
                                  }
                                },
                                yData: {
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: ['xData', 'yData']
                            },
                            usedMemory: {
                              type: 'object',
                              properties: {
                                name: {
                                  type: 'string'
                                },
                                xData: {
                                  type: 'array',
                                  items: {
                                    type: 'number'
                                  }
                                },
                                yData: {
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: ['xData', 'yData']
                            },
                            cpu: {
                              type: 'number'
                            },
                            memory: {
                              type: 'number'
                            },
                            podReason: {
                              type: 'string'
                            },
                            podMessage: {
                              type: 'string'
                            },
                            containerStatus: {
                              type: 'object',
                              properties: {
                                label: {
                                  type: 'string'
                                },
                                value: {
                                  type: 'string'
                                },
                                color: {
                                  type: 'string'
                                },
                                reason: {
                                  type: 'string'
                                },
                                message: {
                                  type: 'string'
                                }
                              },
                              required: ['label', 'value', 'color']
                            }
                          },
                          required: [
                            'podName',
                            'status',
                            'nodeName',
                            'ip',
                            'restarts',
                            'age',
                            'usedCpu',
                            'usedMemory',
                            'cpu',
                            'memory',
                            'containerStatus'
                          ]
                        },
                        {
                          type: 'object',
                          additionalProperties: {}
                        }
                      ]
                    }
                  }
                },
                required: ['data']
              }
            }
          }
        },
        '400': {
          description: 'Invalid query parameters',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'number'
                  },
                  message: {
                    type: 'string'
                  },
                  data: {
                    type: 'string'
                  }
                },
                required: ['code', 'message']
              }
            }
          }
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'number'
                  },
                  message: {
                    type: 'string'
                  },
                  data: {
                    type: 'string'
                  }
                },
                required: ['code', 'message']
              }
            }
          }
        }
      }
    }
  }
};

export async function GET(request: Request) {
  const domain = process.env.SEALOS_DOMAIN || '';
  //Since the API currently only has English documentation, we'll use EN here for now
  const mcp = getToolsList(path.join(process.cwd(), 'public', 'devbox.json'), 'en');
  try {
    const baseDoc = tmpOpenApiDocument(domain, mcp);
    const openApiDoc = {
      ...baseDoc,
      paths: {
        ...baseDoc.paths,
        ...applaunchpadDocument
      }
    };
    return NextResponse.json(openApiDoc);
  } catch (error) {
    console.error('Error generating OpenAPI document:', error);
    return NextResponse.json({ error: 'Failed to generate API documentation' }, { status: 500 });
  }
}
