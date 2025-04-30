import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import {
  RequestSchema as CreateDevboxRequestSchema,
  SuccessResponseSchema as CreateDevboxSuccessResponseSchema
} from './createDevbox/schema';
import { SuccessResponseSchema as ListOfficialSuccessResponseSchema } from './v1/getOfficialRuntimeList/schema';
import {
  RequestSchema as ListTemplatesRequestSchema,
  SuccessResponseSchema as ListTemplatesSuccessResponseSchema
} from './templateRepository/template/list/schema';
import {
  RequestSchema as DelDevboxRequestSchema,
  SuccessResponseSchema as DelDevboxSuccessResponseSchema,
  ErrorResponseSchema as DelDevboxErrorResponseSchema
} from './delDevbox/schema';
import {
  RequestSchema as StartDevboxRequestSchema,
  SuccessResponseSchema as StartDevboxSuccessResponseSchema,
  ErrorResponseSchema as StartDevboxErrorResponseSchema
} from './startDevbox/schema';
import {
  RequestSchema as ShutdownDevboxRequestSchema,
  SuccessResponseSchema as ShutdownDevboxSuccessResponseSchema,
  ErrorResponseSchema as ShutdownDevboxErrorResponseSchema
} from './shutdownDevbox/schema';
import {
  RequestSchema as RestartDevboxRequestSchema,
  SuccessResponseSchema as RestartDevboxSuccessResponseSchema,
  ErrorResponseSchema as RestartDevboxErrorResponseSchema
} from './restartDevbox/schema';
import {
  RequestSchema as GetSSHConnectionInfoRequestSchema,
  SuccessResponseSchema as GetSSHConnectionInfoSuccessResponseSchema,
  ErrorResponseSchema as GetSSHConnectionInfoErrorResponseSchema
} from './v1/getSshInfo/schema';
import {
  RequestSchema as CreateDevboxPortRequestSchema,
  SuccessResponseSchema as CreateDevboxPortSuccessResponseSchema,
  ErrorResponseSchema as CreateDevboxPortErrorResponseSchema
} from './createDevboxPort/schema';
import {
  RequestSchema as ReleaseDevboxRequestSchema,
  SuccessResponseSchema as ReleaseDevboxSuccessResponseSchema,
  ErrorResponseSchema as ReleaseDevboxErrorResponseSchema
} from './releaseDevbox/schema';
import {
  RequestSchema as GetDevboxVersionListRequestSchema,
  SuccessResponseSchema as GetDevboxVersionListSuccessResponseSchema,
  ErrorResponseSchema as GetDevboxVersionListErrorResponseSchema
} from './getDevboxVersionList/schema';
import {
  DeployDevboxRequestSchema,
  DeployDevboxSuccessResponseSchema,
  DeployDevboxErrorResponseSchema
} from './deployDevbox/schema';
import {
  ReleaseAndDeployDevboxRequestSchema,
  ReleaseAndDeployDevboxResponseSchema
} from './releaseAndDeployDevbox/schema';
import {
  RequestSchema as GetDevboxByNameRequestSchema,
  SuccessResponseSchema as GetDevboxByNameSuccessResponseSchema,
  ErrorResponseSchema as GetDevboxByNameErrorResponseSchema
} from './v1/getDevboxByNameEasyResponse/schema';
import { ResponseSchema as GetDevboxListResponseSchema } from './v1/getDevboxListEasyResponse/schema';
export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.string().optional()
});

// generate openapi document
export const openApiDocument = (sealosDomain: string) =>
  createDocument({
    openapi: '3.0.0',
    info: {
      title: 'Devbox API',
      version: '1.0.0',
      description: 'API documentation for Devbox service'
    },
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
      '/api/createDevbox': {
        post: {
          summary: 'Create a new devbox',
          description:
            'Create a new devbox, you need to use the /api/templateRepository/listOfficial interface to get the runtime list before using this interface, for the requestBody templateRepositoryUid; you need to use the /api/templateRepository/template/list interface to get the specific version list of the runtime, for the requestBody templateUid, templateConfig and image',
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
      '/api/deployDevbox': {
        post: {
          summary: 'Deploy a devbox',
          description:
            'Deploy a devbox with specific tag and resource configuration, you can use the /api/getDevboxVersionList interface to get the devbox version list to get the tag',
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
            },
            '400': {
              description: 'Invalid request body',
              content: {
                'application/json': {
                  schema: DeployDevboxErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: DeployDevboxErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/releaseDevbox': {
        post: {
          summary: 'Create a new devbox release',
          description:
            'Create a new release for an existing devbox with a specific tag and description. You can use the /api/getDevboxVersionList interface to get the devbox version list. Since the release process takes a long time, this interface will not return any data. Please use the /api/getDevboxVersionList interface to check the release status.Beside,you need to stopped the devbox(stopped is ok,no need to shutdown) before releasing it.',
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
      '/api/delDevbox': {
        delete: {
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
      '/api/startDevbox': {
        post: {
          summary: 'Start a devbox',
          description: 'Start a devbox and its associated resources (service, ingress, etc.)',
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
              description: 'Invalid request body',
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
      '/api/shutdownDevbox': {
        post: {
          summary: 'Shutdown a devbox',
          description: 'Shutdown a devbox and its associated resources (service, ingress, etc.)',
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
              description: 'Invalid request body',
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
      '/api/restartDevbox': {
        post: {
          summary: 'Restart a devbox',
          description: 'Restart a devbox and its associated resources (service, ingress, etc.)',
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
              description: 'Invalid request body',
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
      '/api/v1/getSshInfo': {
        get: {
          summary: 'Get SSH connection information',
          description:
            'Get SSH connection information for a devbox, including keys, token, and configuration',
          requestParams: {
            query: GetSSHConnectionInfoRequestSchema
          },
          responses: {
            '200': {
              description: 'Successfully retrieved SSH connection information',
              content: {
                'application/json': {
                  schema: GetSSHConnectionInfoSuccessResponseSchema
                }
              }
            },
            '400': {
              description: 'Invalid request parameters',
              content: {
                'application/json': {
                  schema: GetSSHConnectionInfoErrorResponseSchema
                }
              }
            },
            '404': {
              description: 'SSH keys not found',
              content: {
                'application/json': {
                  schema: GetSSHConnectionInfoErrorResponseSchema
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: GetSSHConnectionInfoErrorResponseSchema
                }
              }
            }
          }
        }
      },
      '/api/createDevboxPort': {
        post: {
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
      '/api/v1/getOfficialRuntimeList': {
        get: {
          summary: 'Get the official runtime list',
          description: 'Get all available official runtime lists, no authentication required',
          responses: {
            '200': {
              description: 'Successfully retrieved official runtime list',
              content: {
                'application/json': {
                  schema: ListOfficialSuccessResponseSchema
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
      '/api/templateRepository/template/list': {
        get: {
          summary: 'Get the runtime version list of the specified runtime',
          description:
            'Get all available runtime version list of the specified runtime, need JWT authentication',
          requestParams: {
            query: ListTemplatesRequestSchema
          },
          responses: {
            '200': {
              description: 'Successfully retrieved runtime version list',
              content: {
                'application/json': {
                  schema: ListTemplatesSuccessResponseSchema
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
              description: 'Repository not found',
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
      '/api/getDevboxVersionList': {
        get: {
          summary: 'Get devbox version list',
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
      '/api/releaseAndDeployDevbox': {
        post: {
          summary: 'Release and deploy a devbox',
          description:
            'Create a new release for a devbox and deploy it with specific resource configuration',
          requestBody: {
            content: {
              'application/json': {
                schema: ReleaseAndDeployDevboxRequestSchema
              }
            }
          },
          responses: {
            '200': {
              description: 'Devbox released and deployed successfully',
              content: {
                'application/json': {
                  schema: ReleaseAndDeployDevboxResponseSchema
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
            '409': {
              description: 'Devbox release already exists',
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
      '/api/v1/getDevboxByNameEasyResponse': {
        get: {
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
      '/api/v1/getDevboxListEasyResponse': {
        get: {
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
