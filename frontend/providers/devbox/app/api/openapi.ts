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
  RequestSchema as CreateDevboxPortRequestSchema,
  SuccessResponseSchema as CreateDevboxPortSuccessResponseSchema,
  ErrorResponseSchema as CreateDevboxPortErrorResponseSchema
} from './v1/createDevboxPort/schema';
import {
  RequestSchema as ReleaseDevboxRequestSchema,
  SuccessResponseSchema as ReleaseDevboxSuccessResponseSchema,
  ErrorResponseSchema as ReleaseDevboxErrorResponseSchema
} from './v1/releaseDevboxDefault/schema';
import {
  RequestSchema as GetDevboxVersionListRequestSchema,
  SuccessResponseSchema as GetDevboxVersionListSuccessResponseSchema,
  ErrorResponseSchema as GetDevboxVersionListErrorResponseSchema
} from './v1/getDevboxReleaseListDefault/schema';
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
import {
  RequestSchema as RemoveDevboxPortRequestSchema,
  SuccessResponseSchema as RemoveDevboxPortSuccessResponseSchema,
  ErrorResponseSchema as RemoveDevboxPortErrorResponseSchema
} from './v1/removeDevboxPort/schema';
import {
  RequestSchema as CreateSimpleDevboxRequestSchema,
  SuccessResponseSchema as CreateSimpleDevboxSuccessResponseSchema
} from './v1/createSimpleDevbox/schema';

export const ErrorResponseSchema = z.object({
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
      description: 'API documentation for Devbox service'
    },
    tags: [
      {
        name: 'Lifecycle',
        description: 'Devbox lifecycle management operations'
      },
      {
        name: 'ReleaseAndDeploy',
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
        description: 'Application management'
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
      '/api/createDevbox': {
        post: {
          tags: ['Lifecycle'],
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
      '/api/v1/createSimpleDevbox': {
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
      '/api/deployDevbox': {
        post: {
          tags: ['ReleaseAndDeploy'],
          summary: 'Deploy a devbox',
          description:
            'Deploy a devbox with specific tag and resource configuration, you can use the /api/v1/getDevboxVersionListDefault interface to get the devbox version list to get the tag',
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
      '/api/v1/releaseDevboxDefault': {
        post: {
          tags: ['ReleaseAndDeploy'],
          summary: 'Create a new devbox release',
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
      '/api/delDevbox': {
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
      '/api/startDevbox': {
        post: {
          tags: ['Lifecycle'],
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
          tags: ['Lifecycle'],
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
          tags: ['Lifecycle'],
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
      '/api/v1/createDevboxPort': {
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
      '/api/v1/removeDevboxPort': {
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
      '/api/v1/getOfficialRuntimeList': {
        get: {
          tags: ['Runtime'],
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
          tags: ['Runtime'],
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
      '/api/v1/getDevboxReleaseListDefault': {
        get: {
          tags: ['ReleaseAndDeploy'],
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
      '/api/releaseAndDeployDevbox': {
        post: {
          tags: ['ReleaseAndDeploy'],
          summary: 'ReleaseAndDeploy and deploy a devbox',
          description:
            'Create a new release for a devbox and deploy it with specific resource configuration,you need to shutdown the devbox before releasing it',
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
      '/api/v1/getDevboxListEasyResponse': {
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
                            default: 'zqpqdcalxjeq'
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
                          portName: 'sscvofyimjui',
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
  }
};

export const openApiDocument = (sealosDomain: string) => {
  const baseDoc = tmpOpenApiDocument(sealosDomain);
  return {
    ...baseDoc,
    paths: {
      ...baseDoc.paths,
      ...applaunchpadDocument
    }
  };
};
