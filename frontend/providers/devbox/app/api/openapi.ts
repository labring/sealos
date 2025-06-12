import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import {
  RequestSchema as DelDevboxRequestSchema,
  SuccessResponseSchema as DelDevboxSuccessResponseSchema,
  ErrorResponseSchema as DelDevboxErrorResponseSchema
} from './v1/DevBox/delete/schema';

import {
  RequestSchema as CreateDevboxPortRequestSchema,
  SuccessResponseSchema as CreateDevboxPortSuccessResponseSchema,
  ErrorResponseSchema as CreateDevboxPortErrorResponseSchema
} from './v1/DevBox/ports/create/schema';
import {
  RequestSchema as ReleaseDevboxRequestSchema,
  SuccessResponseSchema as ReleaseDevboxSuccessResponseSchema,
  ErrorResponseSchema as ReleaseDevboxErrorResponseSchema
} from './v1/DevBox/release/schema';
import {
  RequestSchema as GetDevboxVersionListRequestSchema,
  SuccessResponseSchema as GetDevboxVersionListSuccessResponseSchema,
  ErrorResponseSchema as GetDevboxVersionListErrorResponseSchema
} from './v1/DevBox/releases/schema';
import {
  DeployDevboxRequestSchema,
  DeployDevboxSuccessResponseSchema,
  DeployDevboxErrorResponseSchema
} from './deployDevbox/schema';
import {
  RequestSchema as GetDevboxByNameRequestSchema,
  SuccessResponseSchema as GetDevboxByNameSuccessResponseSchema,
  ErrorResponseSchema as GetDevboxByNameErrorResponseSchema
} from './v1/DevBox/get/schema';
import { ResponseSchema as GetDevboxListResponseSchema } from './v1/DevBox/list/schema';
import {
  RequestSchema as RemoveDevboxPortRequestSchema,
  SuccessResponseSchema as RemoveDevboxPortSuccessResponseSchema,
  ErrorResponseSchema as RemoveDevboxPortErrorResponseSchema
} from './v1/DevBox/ports/remove/schema';
import {
  RequestSchema as CreateSimpleDevboxRequestSchema,
  SuccessResponseSchema as CreateSimpleDevboxSuccessResponseSchema
} from './v1/DevBox/create/schema';
import {
  RequestSchema as LifecycleDevboxRequestSchema,
  SuccessResponseSchema as LifecycleDevboxSuccessResponseSchema,
  ErrorResponseSchema as LifecycleDevboxErrorResponseSchema
} from './v1/DevBox/lifecycle/schema';

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
      '/api/v1/DevBox/create': {
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
      '/api/v1/DevBox/lifecycle': {
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
      '/api/v1/DevBox/release': {
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
      '/api/v1/DevBox/delete': {
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
      '/api/v1/DevBox/ports/create': {
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
      '/api/v1/DevBox/ports/remove': {
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
      '/api/v1/DevBox/releases': {
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
      '/api/v1/DevBox/get': {
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
  '/api/v1/createApp': {
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
  '/api/v1/getApps': {
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
  '/api/v1/getAppByAppName': {
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
  '/api/v1/delAppByName': {
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
  '/api/v1/getAppPodsByAppName': {
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
