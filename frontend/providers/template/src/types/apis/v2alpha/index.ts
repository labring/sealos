import { createDocument } from 'zod-openapi';

import * as listTemplateSchemas from './list-template';
import * as getTemplateSchemas from './get-template';
import * as createInstanceSchemas from './create-instance';
import {
  createError400Schema,
  createError401Schema,
  createError403Schema,
  createError404Schema,
  createError409Schema,
  createError422Schema,
  createError500Schema,
  createError503Schema,
  ErrorType,
  ErrorCode,
  createErrorExample
} from '../../v2alpha/error';

export * as listTemplateSchemas from './list-template';
export * as getTemplateSchemas from './get-template';
export * as createInstanceSchemas from './create-instance';

export const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Template API',
    version: '2.0.0-alpha',
    description:
      'This API provides endpoints for managing application templates and instances in the Sealos platform.\n\n' +
      '## Authentication\n\n' +
      'Browsing templates is public. Deploying instances requires a URL-encoded kubeconfig in the `Authorization` header. ' +
      'Encode with `encodeURIComponent(kubeconfigYaml)` before setting the header value. ' +
      'Obtain your kubeconfig from the Sealos console.\n\n' +
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
      '- `details` — optional extra context; shape varies by `code` (field list, string, or object)\n\n' +
      '## Operations\n\n' +
      '**Query** (read-only): returns `200 OK` with data in the response body.\n\n' +
      '**Mutation** (write):\n' +
      '- Create → `201 Created` with the created resource in the response body.\n' +
      '- Update / Delete → `204 No Content` with no response body.'
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v2alpha',
      description: 'Local development'
    },
    {
      url: '{baseUrl}/api/v2alpha',
      description: 'Custom',
      variables: {
        baseUrl: {
          default: 'https://template.example.com',
          description: 'Base URL of your instance (e.g. https://template.192.168.x.x.nip.io)'
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
      }
    }
  },
  security: [{ kubeconfigAuth: [] }],
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
  paths: {
    '/templates': {
      get: {
        tags: ['Query'],
        summary: 'List all templates',
        description:
          'Returns metadata only (no resource calculation). Response headers: `Cache-Control` (public, max-age=300, s-maxage=600), `ETag`. When categories exist, top category keys are returned in `X-Menu-Keys` (comma-separated). For full details including resource requirements, use `/templates/{name}`.',
        operationId: 'listTemplates',
        security: [],
        requestParams: {
          query: listTemplateSchemas.queryParams
        },
        responses: {
          '200': {
            description: 'Successfully retrieved template list',
            headers: {
              'Cache-Control': {
                description: 'Caching directive: public, max-age=300, s-maxage=600',
                schema: { type: 'string', example: 'public, max-age=300, s-maxage=600' }
              },
              ETag: {
                description: 'Entity tag for caching, format: "template-list-{language}"',
                schema: { type: 'string', example: '"template-list-en"' }
              },
              'X-Menu-Keys': {
                description:
                  'Top category keys (comma-separated). Present only when categories exist.',
                schema: { type: 'string', example: 'ai,database' }
              }
            },
            content: {
              'application/json': {
                schema: listTemplateSchemas.response,
                examples: {
                  templateList: {
                    summary: 'Sample template list',
                    value: [
                      {
                        name: 'perplexica',
                        resourceType: 'template',
                        readme:
                          'https://raw.githubusercontent.com/ItzCrazyKns/Perplexica/master/README.md',
                        icon: 'https://raw.githubusercontent.com/ItzCrazyKns/Perplexica/refs/heads/master/src/app/favicon.ico',
                        description: 'AI-powered search engine',
                        gitRepo: 'https://github.com/ItzCrazyKns/Perplexica',
                        category: ['ai'],
                        args: {
                          OPENAI_API_KEY: {
                            description: 'OpenAI API Key',
                            type: 'string',
                            default: '',
                            required: true
                          }
                        },
                        deployCount: 156
                      }
                    ]
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                examples: {
                  internalError: {
                    summary: 'Failed to load templates',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.INTERNAL_ERROR,
                      'Failed to load templates.',
                      'File read error'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/templates/{name}': {
      get: {
        tags: ['Query'],
        summary: 'Get template details',
        description:
          'Returns complete template metadata with dynamically calculated resource requirements (CPU, memory, storage, NodePort count) derived from the template YAML. Falls back to static configuration if calculation fails. Response headers: `Cache-Control` (public, max-age=300, s-maxage=600), `ETag`.',
        operationId: 'getTemplate',
        security: [],
        requestParams: {
          path: getTemplateSchemas.pathParams,
          query: getTemplateSchemas.queryParams
        },
        responses: {
          '200': {
            description: 'Successfully retrieved template details',
            headers: {
              'Cache-Control': {
                description: 'Caching directive: public, max-age=300, s-maxage=600',
                schema: { type: 'string', example: 'public, max-age=300, s-maxage=600' }
              },
              ETag: {
                description: 'Entity tag for caching, format: "{name}-{language}"',
                schema: { type: 'string', example: '"perplexica-en"' }
              }
            },
            content: {
              'application/json': {
                schema: getTemplateSchemas.response,
                examples: {
                  templateDetail: {
                    summary: 'Sample template with resource calculation',
                    value: {
                      name: 'perplexica',
                      resourceType: 'template',
                      quota: {
                        cpu: 1,
                        memory: 2.25,
                        storage: 2,
                        nodeport: 0
                      },
                      readme:
                        'https://raw.githubusercontent.com/ItzCrazyKns/Perplexica/master/README.md',
                      icon: 'https://raw.githubusercontent.com/ItzCrazyKns/Perplexica/refs/heads/master/src/app/favicon.ico',
                      description: 'AI-powered search engine',
                      gitRepo: 'https://github.com/ItzCrazyKns/Perplexica',
                      category: ['ai'],
                      args: {
                        OPENAI_API_KEY: {
                          description: 'The API Key of the OpenAI-compatible service',
                          type: 'string',
                          default: '',
                          required: true
                        }
                      },
                      deployCount: 156
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad request - template name is required',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  nameRequired: {
                    summary: 'Template name is required',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Template name is required.',
                      [{ field: 'name', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Template not found',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  templateNotFound: {
                    summary: 'Template not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      "Template 'nonexistent' not found."
                    )
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: createError500Schema([ErrorCode.INTERNAL_ERROR]),
                examples: {
                  internalError: {
                    summary: 'Failed to get template details',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.INTERNAL_ERROR,
                      'Failed to get template details.',
                      'YAML parsing error'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/templates/instances': {
      post: {
        tags: ['Mutation'],
        summary: 'Create template instance',
        description:
          "Deploy a named instance of a template into the user's Kubernetes namespace. " +
          "User-provided `args` are merged with the template's declared defaults — only args with no default value are required. " +
          'The `args` field in the response reflects the fully resolved values after applying defaults.\n\n' +
          '**Example — create a Perplexica instance:**\n' +
          '```json\n' +
          '{\n' +
          '  "name": "my-app-instance",\n' +
          '  "template": "perplexica",\n' +
          '  "args": {\n' +
          '    "OPENAI_API_KEY": "<your-api-key>",\n' +
          '    "OPENAI_MODEL_NAME": "gpt-4o"\n' +
          '  }\n' +
          '}\n' +
          '```',
        operationId: 'createInstance',
        requestBody: {
          required: true,
          description: 'Instance creation configuration',
          content: {
            'application/json': {
              schema: createInstanceSchemas.requestBody
            }
          }
        },
        responses: {
          '201': {
            description: 'Instance created successfully',
            content: {
              'application/json': {
                schema: createInstanceSchemas.response,
                examples: {
                  instanceCreated: {
                    summary: 'Instance created successfully',
                    value: {
                      name: 'my-perplexica-instance',
                      uid: '778bf3c6-b412-4a02-908b-cf1470867c93',
                      resourceType: 'instance',
                      displayName: '',
                      createdAt: '2026-01-28T03:31:01Z',
                      args: {
                        OPENAI_API_KEY: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
                        OPENAI_API_URL: 'https://api.openai.com/v1',
                        OPENAI_MODEL_NAME: 'gpt-4o'
                      },
                      resources: [
                        {
                          name: 'my-perplexica-instance-searxng',
                          uid: '5bd2c77d-b8f4-4aa4-97ee-c205f2d10aa9',
                          resourceType: 'deployment',
                          quota: { cpu: 0.1, memory: 0.25, storage: 0, replicas: 1 }
                        },
                        {
                          name: 'my-perplexica-instance',
                          uid: '256e2577-fa3a-4471-a94c-8cbd5410187c',
                          resourceType: 'statefulset',
                          quota: { cpu: 0.2, memory: 0.5, storage: 1, replicas: 1 }
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad request - missing or invalid parameters',
            content: {
              'application/json': {
                schema: createError400Schema([
                  ErrorCode.INVALID_PARAMETER,
                  ErrorCode.INVALID_VALUE
                ]),
                examples: {
                  invalidParameter: {
                    summary: 'Instance or template name required',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Instance name is required.',
                      [{ field: 'name', message: 'Required' }]
                    )
                  },
                  invalidValue: {
                    summary: 'Invalid instance name format',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_VALUE,
                      'Instance name must start and end with a lowercase letter or number, and can only contain lowercase letters, numbers, and hyphens.'
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
                      'Invalid or missing kubeconfig.'
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
                schema: createError403Schema([ErrorCode.PERMISSION_DENIED]),
                examples: {
                  insufficientPermissions: {
                    summary: 'Insufficient privileges to create resources',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Permission denied: insufficient privileges to create resources.',
                      'deployments.apps is forbidden: User "system:serviceaccount:ns-xxx" cannot create resource "deployments" in API group "apps" in the namespace "ns-xxx"'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Template not found',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  templateNotFound: {
                    summary: 'Template does not exist',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      "Template 'nonexistent-template' not found."
                    )
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict - Instance already exists',
            content: {
              'application/json': {
                schema: createError409Schema([ErrorCode.ALREADY_EXISTS]),
                examples: {
                  alreadyExists: {
                    summary: 'Instance with this name already exists',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.ALREADY_EXISTS,
                      "Instance 'my-perplexica-instance' already exists.",
                      'deployments.apps "my-perplexica-instance" already exists'
                    )
                  }
                }
              }
            }
          },
          '422': {
            description:
              'Unprocessable Entity - K8s rejected the resource (admission webhook, invalid field, quota exceeded)',
            content: {
              'application/json': {
                schema: createError422Schema(),
                examples: {
                  invalidResourceSpec: {
                    summary: 'Resource spec rejected by cluster',
                    value: createErrorExample(
                      ErrorType.OPERATION_ERROR,
                      ErrorCode.INVALID_RESOURCE_SPEC,
                      'Failed to create instance: invalid resource specification.',
                      'admission webhook "vingress.sealos.io" denied the request: cannot verify ingress host'
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
                      'Failed to create instance in Kubernetes.',
                      'Unexpected error from Kubernetes API'
                    )
                  },
                  internalError: {
                    summary: 'Unexpected server error',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.INTERNAL_ERROR,
                      'Failed to create instance.',
                      'Template parsing error'
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
                      'Kubernetes cluster is temporarily unavailable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
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
