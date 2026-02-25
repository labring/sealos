import { createDocument } from 'zod-openapi';

import * as listTemplateSchemas from './list-template';
import * as getTemplateSchemas from './get-template';
import * as createTemplateSchemas from './create-template';
import * as createInstanceSchemas from './create-instance';
import {
  Error400Schema,
  Error401Schema,
  Error403Schema,
  Error404Schema,
  Error405Schema,
  Error409Schema,
  Error422Schema,
  Error500Schema,
  Error503Schema,
  ErrorType,
  ErrorCode,
  createErrorExample
} from '../../v2alpha/error';

export * as listTemplateSchemas from './list-template';
export * as getTemplateSchemas from './get-template';
export * as createTemplateSchemas from './create-template';
export * as createInstanceSchemas from './create-instance';

export const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Sealos Template API v2alpha',
    version: '2.0.0-alpha',
    description: `
# Sealos Template API Documentation

This API provides endpoints for managing application templates and instances in the Sealos platform.

## API Groups

### Query Operations
Read-only operations for retrieving template and instance information.

### Mutation Operations
Operations that modify data, such as creating or deleting instances.

## Response Format

- **Query APIs** return JSON payloads with data and metadata.
- **Mutation APIs** return HTTP 204 (No Content) on success and no response body.

**Error Response:**
\`\`\`json
{
  "error": {
    "type": "validation_error",
    "code": "INVALID_PARAMETER",
    "message": "Human-readable description.",
    "details": [{ "field": "name", "message": "Required" }]
  }
}
\`\`\`

## Error Status Codes

- \`200\` - Query success
- \`204\` - Mutation success (No Content)
- \`400\` - Bad Request (validation or client error)
- \`401\` - Unauthorized (missing or invalid credentials)
- \`403\` - Forbidden (insufficient permissions)
- \`404\` - Not Found (resource doesn't exist)
- \`405\` - Method Not Allowed
- \`409\` - Conflict (resource already exists)
- \`422\` - Unprocessable Entity (K8s rejected the resource spec)
- \`500\` - Internal Server Error
- \`503\` - Service Unavailable (K8s cluster temporarily unreachable)
    `
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v2alpha',
      description: 'Local development server'
    },
    {
      url: 'https://template./api/v2alpha',
      description: 'Production server'
    },
    {
      url: 'https://template.192.168.12.53.nip.io/api/v2alpha',
      description: 'Testing server'
    }
  ],
  components: {
    securitySchemes: {
      kubeconfigAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description:
          'URL-encoded kubeconfig YAML string. Use `encodeURIComponent(kubeconfigYaml)` to encode.'
      }
    }
  },
  tags: [
    {
      name: 'Query',
      description: 'Read-only operations for retrieving data'
    },
    {
      name: 'Mutation',
      description: 'Operations that modify data'
    }
  ],
  paths: {
    '/template': {
      get: {
        tags: ['Query'],
        summary: 'List All Templates',
        description:
          'Returns metadata only (no resource calculation). Available categories are returned in the `X-Menu-Keys` response header. For full details including resource requirements, use `/template/{name}`.',
        operationId: 'listTemplates',
        requestParams: {
          query: listTemplateSchemas.queryParams
        },
        responses: {
          '200': {
            description: 'Successfully retrieved template list',
            content: {
              'application/json': {
                schema: listTemplateSchemas.response,
                example: [
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
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: Error500Schema,
                example: createErrorExample(
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
    },
    '/template/{name}': {
      get: {
        tags: ['Query'],
        summary: 'Get Template Details',
        description:
          'Returns complete template metadata with dynamically calculated resource requirements (CPU, memory, storage, NodePort count) derived from the template YAML. Falls back to static configuration if calculation fails.',
        operationId: 'getTemplateDetail',
        requestParams: {
          path: getTemplateSchemas.pathParams,
          query: getTemplateSchemas.queryParams
        },
        responses: {
          '200': {
            description: 'Successfully retrieved template details',
            content: {
              'application/json': {
                schema: getTemplateSchemas.response,
                example: {
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
          },
          '404': {
            description: 'Template not found',
            content: {
              'application/json': {
                schema: Error404Schema,
                examples: {
                  templatesNotFound: {
                    summary: 'Templates catalog not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      'Templates catalog not found.'
                    )
                  },
                  templateNotFound: {
                    summary: 'Specific template does not exist',
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
                schema: Error500Schema,
                example: createErrorExample(
                  ErrorType.INTERNAL_ERROR,
                  ErrorCode.INTERNAL_ERROR,
                  'Failed to get template details.',
                  'YAML parsing error'
                )
              }
            }
          }
        }
      },
      post: {
        tags: ['Mutation'],
        summary: 'Deploy Template',
        description:
          "Deploy a template to the user's namespace. Namespace is automatically resolved from the kubeconfig — no need to specify it. Template variables are provided as a flat key-value object directly in the request body (not wrapped in an `args` field).",
        operationId: 'deployTemplate',
        security: [{ kubeconfigAuth: [] }],
        requestParams: {
          path: createTemplateSchemas.pathParams
        },
        requestBody: {
          description: 'Template deployment configuration',
          content: {
            'application/json': {
              schema: createTemplateSchemas.requestBody,
              example: {
                OPENAI_API_KEY: 'your-api-key-here',
                APP_NAME: 'my-app-instance',
                MEMORY_LIMIT: '2Gi'
              }
            }
          }
        },
        responses: {
          '204': {
            description: 'Template deployment started successfully'
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: Error400Schema,
                examples: {
                  missingParameters: {
                    summary: 'Missing template parameters',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Template parameters are required.'
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Authentication failed',
            content: {
              'application/json': {
                schema: Error401Schema,
                examples: {
                  missingKubeconfig: {
                    summary: 'Missing or invalid kubeconfig',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Invalid or missing kubeconfig.'
                    )
                  },
                  clusterAuthFailed: {
                    summary: 'Cannot authenticate with Kubernetes cluster',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Invalid kubeconfig or insufficient permissions.',
                      'Failed to authenticate with Kubernetes cluster'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Template not found or invalid',
            content: {
              'application/json': {
                schema: Error404Schema,
                examples: {
                  templateNotFound: {
                    summary: 'Template does not exist',
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
                schema: Error500Schema,
                example: createErrorExample(
                  ErrorType.INTERNAL_ERROR,
                  ErrorCode.INTERNAL_ERROR,
                  'Failed to deploy template.',
                  'Kubernetes API error'
                )
              }
            }
          }
        }
      }
    },
    '/template/instance': {
      post: {
        tags: ['Mutation'],
        summary: 'Create Template Instance',
        description: `Deploy a named instance of a template into the user's Kubernetes namespace. User-provided \`args\` are merged with the template's declared defaults — only args with no default value are required. The \`args\` field in the response reflects the fully resolved values after applying defaults.

**Example:**
\`\`\`http
POST /api/v2alpha/template/instance HTTP/1.1
Host: template.cloud.sealos.io
Content-Type: application/json
Authorization: <URL-encoded kubeconfig>

{
  "name": "my-perplexica",
  "template": "perplexica",
  "args": { "OPENAI_API_KEY": "sk-xxx", "OPENAI_MODEL_NAME": "gpt-4o" }
}
\`\`\``,
        operationId: 'createInstance',
        security: [{ kubeconfigAuth: [] }],
        requestBody: {
          description: 'Instance creation configuration',
          content: {
            'application/json': {
              schema: createInstanceSchemas.requestBody,
              example: {
                name: 'my-perplexica-instance',
                template: 'perplexica',
                args: {
                  OPENAI_API_KEY: 'your-api-key-here',
                  OPENAI_MODEL_NAME: 'gpt-4o'
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Instance created successfully',
            content: {
              'application/json': {
                schema: createInstanceSchemas.response,
                example: {
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
          },
          '400': {
            description: 'Bad request - missing or invalid parameters',
            content: {
              'application/json': {
                schema: Error400Schema,
                examples: {
                  missingInstanceName: {
                    summary: 'Instance name is required',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Instance name is required.'
                    )
                  },
                  invalidInstanceNameFormat: {
                    summary: 'Invalid instance name format',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_VALUE,
                      'Instance name must start and end with a lowercase letter or number, and can only contain lowercase letters, numbers, and hyphens.'
                    )
                  },
                  instanceNameTooLong: {
                    summary: 'Instance name exceeds 63 characters',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_VALUE,
                      'Instance name must be 63 characters or less.'
                    )
                  },
                  missingTemplateName: {
                    summary: 'Template name is required',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Template name is required.'
                    )
                  },
                  missingRequiredArgs: {
                    summary: 'Missing required template parameters',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_VALUE,
                      'Missing required parameters: OPENAI_API_KEY, OPENAI_MODEL_NAME.'
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Authentication failed',
            content: {
              'application/json': {
                schema: Error401Schema,
                examples: {
                  missingKubeconfig: {
                    summary: 'Missing or invalid kubeconfig',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Invalid or missing kubeconfig.'
                    )
                  },
                  cannotConnectCluster: {
                    summary: 'Cannot authenticate with Kubernetes cluster',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Invalid kubeconfig or insufficient permissions.',
                      'Failed to authenticate with Kubernetes cluster'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Permission denied',
            content: {
              'application/json': {
                schema: Error403Schema,
                examples: {
                  insufficientPrivileges: {
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
            description: 'Template not found or invalid',
            content: {
              'application/json': {
                schema: Error404Schema,
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
          '405': {
            description: 'Method not allowed',
            content: {
              'application/json': {
                schema: Error405Schema,
                example: createErrorExample(
                  ErrorType.CLIENT_ERROR,
                  ErrorCode.METHOD_NOT_ALLOWED,
                  'Method not allowed. Use POST.'
                )
              }
            }
          },
          '409': {
            description: 'Resource conflict - instance already exists',
            content: {
              'application/json': {
                schema: Error409Schema,
                examples: {
                  instanceExists: {
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
            description: 'Unprocessable entity - K8s rejected the resource specification',
            content: {
              'application/json': {
                schema: Error422Schema,
                examples: {
                  admissionWebhookDenied: {
                    summary: 'Admission webhook rejected the request',
                    value: createErrorExample(
                      ErrorType.OPERATION_ERROR,
                      ErrorCode.INVALID_RESOURCE_SPEC,
                      'Failed to create instance: invalid resource specification.',
                      'admission webhook "vingress.sealos.io" denied the request: cannot verify ingress host'
                    )
                  },
                  resourceQuotaExceeded: {
                    summary: 'Resource quota exceeded',
                    value: createErrorExample(
                      ErrorType.OPERATION_ERROR,
                      ErrorCode.INVALID_RESOURCE_SPEC,
                      'Failed to create instance: invalid resource specification.',
                      'exceeded quota: default, requested: cpu=4, used: cpu=8, limited: cpu=10'
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
                schema: Error500Schema,
                examples: {
                  k8sApiError: {
                    summary: 'Kubernetes API error',
                    value: createErrorExample(
                      ErrorType.OPERATION_ERROR,
                      ErrorCode.KUBERNETES_ERROR,
                      'Failed to create instance in Kubernetes.',
                      'Unexpected error from Kubernetes API'
                    )
                  },
                  internalError: {
                    summary: 'Internal YAML generation or processing error',
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
            description: 'Service unavailable - Kubernetes cluster temporarily unreachable',
            content: {
              'application/json': {
                schema: Error503Schema,
                examples: {
                  clusterUnavailable: {
                    summary: 'Kubernetes cluster is temporarily unavailable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'Kubernetes cluster is temporarily unavailable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  },
                  connectionTimeout: {
                    summary: 'Connection to cluster timed out',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'Kubernetes cluster is temporarily unavailable.',
                      'ETIMEDOUT: connection timed out'
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
