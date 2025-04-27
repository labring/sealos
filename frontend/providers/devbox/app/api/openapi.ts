import { z } from 'zod';
import { createDocument, extendZodWithOpenApi } from 'zod-openapi';
import {
  RequestSchema as CreateDevboxRequestSchema,
  SuccessResponseSchema as CreateDevboxSuccessResponseSchema
} from './createDevbox/schema';
import {
  RequestSchema as ListOfficialRequestSchema,
  SuccessResponseSchema as ListOfficialSuccessResponseSchema
} from './templateRepository/listOfficial/schema';
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
} from './getSSHConnectionInfo/schema';
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

// extend zod with openapi
extendZodWithOpenApi(z);

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.string().optional()
});

// generate openapi document
export const openApiDocument = createDocument({
  openapi: '3.0.0',
  info: {
    title: 'Devbox API',
    version: '1.0.0',
    description: 'API documentation for Devbox service'
  },
  servers: [
    {
      url: `http://devbox.192.168.10.35.nip.io`,
      description: 'Sealos Devbox Service'
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
        description: 'Deploy a devbox with specific tag and resource configuration',
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
          'Create a new release for an existing devbox with a specific tag and description. You can use the /api/getDevboxVersionList interface to get the devbox version list. Since the release process takes a long time, this interface will not return any data. Please use the /api/getDevboxVersionList interface to check the release status.',
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
    '/api/getSSHConnectionInfo': {
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
        summary: 'Check port availability and get port information',
        description:
          'Check if a port is available for a devbox and get port information including internal and external addresses',
        requestBody: {
          content: {
            'application/json': {
              schema: CreateDevboxPortRequestSchema
            }
          }
        },
        responses: {
          '200': {
            description: 'Successfully checked port availability and retrieved port information',
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
    '/api/templateRepository/listOfficial': {
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
        description: 'Get all versions of a specific devbox',
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
    }
  }
});
