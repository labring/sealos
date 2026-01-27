import * as z from 'zod';
import { createDocument } from 'zod-openapi';

import * as listTemplateSchemas from './list-template';
import * as getTemplateSchemas from './get-template';
import * as createTemplateSchemas from './create-template';
import * as createInstanceSchemas from './create-instance';
import * as commonSchemas from './common/schema';

export * as listTemplateSchemas from './list-template';
export * as getTemplateSchemas from './get-template';
export * as createTemplateSchemas from './create-template';
export * as createInstanceSchemas from './create-instance';
export * as commonSchemas from './common/schema';

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
  "message": "Error description",
  "error": { ... }
}
\`\`\`

## Error Codes

- \`200\` - Query success
- \`204\` - Mutation success (No Content)
- \`400\` - Bad Request (invalid parameters)
- \`404\` - Not Found (resource doesn't exist)
- \`500\` - Internal Server Error
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
        description: `
## Overview
Get a simplified list of all available templates with basic information.

## Features
- **High Performance**: Optimized for speed (10-50ms response time)
- **No Resource Calculation**: Returns metadata only, without computing resource requirements
- **Multi-language Support**: Supports internationalization via language parameter
- **Category Menu**: Top categories available in response header X-Menu-Keys
- **Direct Array Response**: Returns template array directly without wrapper object

## Use Cases
- Display template list on homepage
- Show available templates in marketplace
- Build category navigation menu

## Performance
This endpoint is optimized for fast response times by skipping resource requirement calculations. For complete template details including resource requirements, use the \`/template/{name}\` endpoint.
        `,
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
                schema: commonSchemas.BaseResponseSchema.extend({
                  code: z.literal(500)
                }),
                example: {
                  message: 'Failed to load templates',
                  error: 'File read error'
                }
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
        description: `
## Overview
Retrieve complete information for a specific template, including dynamically calculated resource requirements.

## Features
- **Complete Information**: Returns all template metadata and configuration
- **Resource Calculation**: Dynamically computes CPU, memory, storage, and port requirements
- **Multi-language Support**: Returns localized content based on language parameter
- **Fallback Strategy**: Uses static configuration if dynamic calculation fails

## Resource Calculation
This endpoint analyzes the template's YAML configuration to calculate:
- **CPU**: Required CPU cores (in cores or {min, max})
- **Memory**: Required memory (in GiB or {min, max})
- **Storage**: Required storage (in GiB or {min, max})
- **NodePort**: Number of NodePort services

## Use Cases
- Display template detail page
- Show resource requirements before deployment
- Validate user's available resources

## Performance
Response time: 50-200ms (includes YAML parsing and resource calculation)
        `,
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
                schema: commonSchemas.BaseResponseSchema.extend({
                  code: z.literal(404)
                }),
                examples: {
                  templatesNotFound: {
                    summary: 'Templates catalog not found',
                    value: {
                      message: 'Templates not found'
                    }
                  },
                  templateNotFound: {
                    summary: 'Specific template does not exist',
                    value: {
                      message: "Template 'nonexistent' not found"
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: commonSchemas.BaseResponseSchema.extend({
                  code: z.literal(500)
                }),
                example: {
                  message: 'Failed to get template details',
                  error: 'YAML parsing error'
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Mutation'],
        summary: 'Deploy Template',
        description: `
## Overview
Deploy a template instance with custom parameters and configurations.

## Features
- **Authentication Required**: Requires valid kubeconfig authentication (validated before deployment)
- **Custom Parameters**: Accepts template variable values directly in request body (no "args" wrapper)
- **Automatic Namespace**: Namespace is automatically resolved from kubeconfig
- **Resource Management**: Automatically creates and manages Kubernetes resources
- **Error Handling**: Returns appropriate error messages for invalid kubeconfig or insufficient permissions

## Deployment Process
1. Authenticates user via kubeconfig header (validates kubeconfig)
2. Extracts namespace from kubeconfig automatically
3. Retrieves template configuration and YAML definitions
4. Processes template variables with provided parameter values (sent directly in request body)
5. Generates Kubernetes manifests based on template
6. Applies resources to user's namespace
7. Returns deployment status

## Use Cases
- Deploy applications from templates
- Create development environments
- Launch services with custom configurations
- Automate application deployment workflows

## Request Parameters
- **name** (path parameter): Template name identifier from the URL path
- **request body**: Direct object containing template variable values (key-value pairs, no "args" wrapper needed)

## Important Notes
- **Resource Creation**: Creates real Kubernetes resources that consume cluster resources
- **Authentication**: Valid kubeconfig is mandatory
- **Namespace**: Namespace is automatically extracted from kubeconfig, no need to specify
        `,
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
                schema: commonSchemas.BaseResponseSchema.extend({
                  code: z.literal(400)
                }),
                examples: {
                  missingParameters: {
                    summary: 'Missing template parameters',
                    value: {
                      message: 'Template parameters are required'
                    }
                  },
                  invalidTemplate: {
                    summary: 'Invalid template or failed to load',
                    value: {
                      message: 'Failed to load template'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Authentication failed',
            content: {
              'application/json': {
                schema: commonSchemas.BaseResponseSchema.extend({
                  code: z.literal(401)
                }),
                examples: {
                  missingKubeconfig: {
                    summary: 'Missing kubeconfig',
                    value: {
                      message: 'Invalid or missing kubeconfig',
                      error: 'Authentication failed'
                    }
                  },
                  invalidKubeconfig: {
                    summary: 'Invalid kubeconfig or insufficient permissions',
                    value: {
                      message: 'Invalid kubeconfig or insufficient permissions',
                      error: 'Failed to authenticate with Kubernetes cluster'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Template not found or invalid',
            content: {
              'application/json': {
                schema: commonSchemas.BaseResponseSchema.extend({
                  code: z.literal(404)
                }),
                examples: {
                  templateNotFound: {
                    summary: 'Template file does not exist',
                    value: {
                      message: "Template 'nonexistent' not found"
                    }
                  },
                  lackOfKindTemplate: {
                    summary: 'Template missing kind: Template definition',
                    value: {
                      message: 'Lack of kind template'
                    }
                  },
                  missingDefaultAppName: {
                    summary: 'Template missing default app_name',
                    value: {
                      message: 'default app_name is missing'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: commonSchemas.BaseResponseSchema.extend({
                  code: z.literal(500)
                }),
                example: {
                  message: 'Failed to deploy template',
                  error: 'Kubernetes API error'
                }
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
        description: `
## Overview

Deploy a template as a named instance in your Kubernetes namespace.

## Deployment Process

1. Validate request body (\`name\`, \`template\`, \`args\`)
2. Authenticate via kubeconfig header
3. Fetch template configuration from catalog
4. Merge user \`args\` with template defaults
5. Generate Kubernetes manifests from template
6. Apply resources to user's namespace
7. Return instance metadata

## Request

### HTTP request

\`\`\`
POST /api/v2alpha/template/instance
\`\`\`

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| \`Content-Type\` | Yes | Must be \`application/json\` |
| \`Authorization\` | Yes | URL-encoded kubeconfig YAML string. Use \`encodeURIComponent(kubeconfigYaml)\` to encode. |

### Request body

Provide a JSON object in the request body:

\`\`\`json
{
  "name": string,
  "template": string,
  "args": {
    "KEY": "value"
  }
}
\`\`\`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| \`name\` | string | Yes | The instance name. Must be 1-63 characters, start and end with alphanumeric, contain only lowercase letters, numbers, and hyphens. Regex: \`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$\` |
| \`template\` | string | Yes | The template name from the catalog. Use \`GET /api/v2alpha/template\` to list available templates. |
| \`args\` | object | No | Template variable key-value pairs. To know which args are required, call \`GET /api/v2alpha/template/{name}\` - the response \`args\` field contains all parameters with their \`required\` flag and \`default\` values. |

### How to Get Template Arguments

To know which args are required, call \`GET /api/v2alpha/template/{name}\` - the response \`args\` field contains all parameters with their \`required\` flag and \`default\` values.

## Response

If successful, this method returns a response body with the following structure:

\`\`\`json
{
  "name": string,
  "namespace": string,
  "template": string,
  "createTime": string,
  "icon": string,
  "description": string,
  "gitRepo": string,
  "readme": string,
  "author": string,
  "categories": [string]
}
\`\`\`

### Properties

| Property | Type | Description |
|----------|------|-------------|
| \`name\` | string | The instance name specified in the request. |
| \`namespace\` | string | The Kubernetes namespace where resources were created. |
| \`template\` | string | The template name used to create the instance. |
| \`createTime\` | string | ISO 8601 timestamp of when the instance was created. |
| \`icon\` | string | URL to the template icon. |
| \`description\` | string | Description of the template. |
| \`gitRepo\` | string | URL to the template's Git repository. |
| \`readme\` | string | URL to the template's README file. |
| \`author\` | string | Author of the template. |
| \`categories\` | array | Categories the template belongs to. |

## Examples

### Example 1: Create Perplexica Instance

**Request:**
\`\`\`json
POST /api/v2alpha/template/instance
Host: template.cloud.sealos.io
Content-Type: application/json
Authorization: <URL-encoded kubeconfig>

{
  "name": "my-perplexica-instance",
  "template": "perplexica",
  "args": {
    "OPENAI_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
    "OPENAI_MODEL_NAME": "gpt-4o"
  }
}
\`\`\`

**Response (201 Created):**
\`\`\`json
{
  "name": "my-perplexica-instance",
  "namespace": "ns-mpn6wepb",
  "template": "perplexica",
  "createTime": "2026-01-27T02:53:51.592Z",
  "icon": "https://raw.githubusercontent.com/ItzCrazyKns/Perplexica/refs/heads/master/src/app/favicon.ico",
  "description": "Perplexica is an open-source AI-powered searching tool or an AI-powered search engine that goes deep into the internet to find answers.",
  "gitRepo": "https://github.com/ItzCrazyKns/Perplexica",
  "readme": "https://raw.githubusercontent.com/ItzCrazyKns/Perplexica/master/README.md",
  "author": "Sealos",
  "categories": ["ai"]
}
\`\`\`

### Example 2: Invalid Instance Name

**Request:**
\`\`\`json
POST /api/v2alpha/template/instance
Host: template.cloud.sealos.io
Content-Type: application/json
Authorization: <URL-encoded kubeconfig>

{
  "name": "My-Invalid-Name",
  "template": "perplexica",
  "args": {
    "OPENAI_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
    "OPENAI_MODEL_NAME": "gpt-4o"
  }
}
\`\`\`

**Response (400 Bad Request):**
\`\`\`json
{
  "message": "Instance name must start and end with a lowercase letter or number, and can only contain lowercase letters, numbers, and hyphens"
}
\`\`\`

### Example 3: Missing Required Args

**Request:**
\`\`\`json
POST /api/v2alpha/template/instance
Host: template.cloud.sealos.io
Content-Type: application/json
Authorization: <URL-encoded kubeconfig>

{
  "name": "my-instance",
  "template": "perplexica",
  "args": {}
}
\`\`\`

**Response (400 Bad Request):**
\`\`\`json
{
  "message": "Missing required parameters: OPENAI_API_KEY, OPENAI_MODEL_NAME"
}
\`\`\`

### Example 4: Authentication Failed 

**Request:**
\`\`\`json
POST /api/v2alpha/template/instance
Host: template.cloud.sealos.io
Content-Type: application/json

{
  "name": "test",
  "template": "perplexica",
  "args": {
    "OPENAI_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
    "OPENAI_MODEL_NAME": "gpt-4o"
  }
}
\`\`\`

**Response (401 Unauthorized):**
\`\`\`json
{
  "message": "Invalid or missing kubeconfig",
  "error": "Authentication failed"
}
\`\`\`

### Example 5: Template Not Found

**Request:**
\`\`\`json
POST /api/v2alpha/template/instance
Host: template.cloud.sealos.io
Content-Type: application/json
Authorization: <URL-encoded kubeconfig>

{
  "name": "my-instance",
  "template": "nonexistent-template",
  "args": {
    "OPENAI_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
    "OPENAI_MODEL_NAME": "gpt-4o"
  }
}
\`\`\`

**Response (404 Not Found):**
\`\`\`json
{
  "message": "Template 'nonexistent-template' not found"
}
\`\`\`

        `,
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
          '201': {
            description: 'Instance created successfully',
            content: {
              'application/json': {
                schema: createInstanceSchemas.response,
                example: {
                  name: 'my-perplexica-instance',
                  namespace: 'ns-user-xxxxx',
                  template: 'perplexica',
                  createTime: '2024-01-15T10:30:00.000Z',
                  icon: 'https://raw.githubusercontent.com/ItzCrazyKns/Perplexica/refs/heads/master/src/app/favicon.ico',
                  description: 'AI-powered search engine',
                  gitRepo: 'https://github.com/ItzCrazyKns/Perplexica',
                  readme:
                    'https://raw.githubusercontent.com/ItzCrazyKns/Perplexica/master/README.md',
                  author: 'ItzCrazyKns',
                  categories: ['ai']
                }
              }
            }
          },
          '400': {
            description: 'Bad request - missing or invalid parameters',
            content: {
              'application/json': {
                schema: createInstanceSchemas.errorResponse,
                examples: {
                  missingInstanceName: {
                    summary: 'Instance name is required',
                    description: 'Returned when name field is missing, empty, or not a string',
                    value: {
                      message: 'Instance name is required'
                    }
                  },
                  invalidInstanceNameFormat: {
                    summary: 'Invalid instance name format',
                    description:
                      'Returned when instance name does not follow Kubernetes DNS subdomain naming rules (lowercase alphanumeric and hyphens only, must start and end with alphanumeric)',
                    value: {
                      message:
                        'Instance name must start and end with a lowercase letter or number, and can only contain lowercase letters, numbers, and hyphens'
                    }
                  },
                  instanceNameTooLong: {
                    summary: 'Instance name too long',
                    description:
                      'Returned when instance name exceeds 63 characters (Kubernetes resource name limit)',
                    value: {
                      message: 'Instance name must be 63 characters or less'
                    }
                  },
                  missingTemplateName: {
                    summary: 'Template name is required',
                    description: 'Returned when template field is missing, empty, or not a string',
                    value: {
                      message: 'Template name is required'
                    }
                  },
                  missingRequiredArgs: {
                    summary: 'Missing required template parameters',
                    description:
                      'Returned when required template arguments are not provided and have no default values',
                    value: {
                      message: 'Missing required parameters: OPENAI_API_KEY, OPENAI_MODEL_NAME'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Authentication failed',
            content: {
              'application/json': {
                schema: createInstanceSchemas.errorResponse,
                examples: {
                  missingKubeconfig: {
                    summary: 'Invalid or missing kubeconfig',
                    description:
                      'Returned when Authorization header is missing or kubeconfig is invalid',
                    value: {
                      message: 'Invalid or missing kubeconfig',
                      error: 'Authentication failed'
                    }
                  },
                  cannotConnectCluster: {
                    summary: 'Cannot connect to Kubernetes cluster',
                    description:
                      'Returned when kubeconfig is valid but cannot establish connection to the cluster',
                    value: {
                      message: 'Invalid kubeconfig or insufficient permissions',
                      error: 'Failed to authenticate with Kubernetes cluster'
                    }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Permission denied',
            content: {
              'application/json': {
                schema: createInstanceSchemas.errorResponse,
                examples: {
                  insufficientPrivileges: {
                    summary: 'Insufficient privileges to create resources',
                    description:
                      'Returned when the authenticated user does not have permission to create resources in the namespace',
                    value: {
                      message: 'Permission denied: insufficient privileges to create resources',
                      error:
                        'deployments.apps is forbidden: User "system:serviceaccount:ns-xxx" cannot create resource "deployments" in API group "apps" in the namespace "ns-xxx"'
                    }
                  },
                  rbacDenied: {
                    summary: 'RBAC policy denied the request',
                    description:
                      'Returned when Kubernetes RBAC policy denies the resource creation',
                    value: {
                      message: 'Permission denied: insufficient privileges to create resources',
                      error: 'Forbidden: cannot create resource'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Template not found or invalid',
            content: {
              'application/json': {
                schema: createInstanceSchemas.errorResponse,
                examples: {
                  templateNotFound: {
                    summary: 'Template file does not exist',
                    description:
                      'Returned when the specified template name does not exist in the system',
                    value: {
                      message: "Template 'nonexistent-template' not found"
                    }
                  },
                  lackOfKindTemplate: {
                    summary: 'Template missing kind: Template definition',
                    description:
                      'Returned when template file exists but is missing the required kind: Template resource definition',
                    value: {
                      message: 'Lack of kind template'
                    }
                  },
                  missingDefaultAppName: {
                    summary: 'Template missing default app_name',
                    description:
                      'Returned when template file exists but is missing the required default app_name configuration',
                    value: {
                      message: 'default app_name is missing'
                    }
                  }
                }
              }
            }
          },
          '405': {
            description: 'Method not allowed',
            content: {
              'application/json': {
                schema: createInstanceSchemas.errorResponse,
                example: {
                  message: 'Method not allowed'
                }
              }
            }
          },
          '409': {
            description: 'Resource conflict - instance already exists',
            content: {
              'application/json': {
                schema: createInstanceSchemas.errorResponse,
                examples: {
                  instanceExists: {
                    summary: 'Instance with this name already exists',
                    description:
                      'Returned when attempting to create an instance with a name that already exists in the namespace',
                    value: {
                      message: "Instance 'my-perplexica-instance' already exists",
                      error: 'deployments.apps "my-perplexica-instance" already exists'
                    }
                  },
                  resourceConflict: {
                    summary: 'Kubernetes resource conflict',
                    description:
                      'Returned when one or more Kubernetes resources generated by the template already exist',
                    value: {
                      message: "Instance 'my-app' already exists",
                      error: 'services "my-app" already exists'
                    }
                  }
                }
              }
            }
          },
          '422': {
            description: 'Unprocessable entity - invalid resource specification',
            content: {
              'application/json': {
                schema: createInstanceSchemas.errorResponse,
                examples: {
                  admissionWebhookDenied: {
                    summary: 'Admission webhook rejected the request',
                    description:
                      'Returned when Kubernetes admission webhook validation fails (e.g., invalid ingress host, resource quota exceeded)',
                    value: {
                      message: 'Failed to create instance: invalid resource specification',
                      error:
                        'admission webhook "vingress.sealos.io" denied the request: cannot verify ingress host'
                    }
                  },
                  invalidResourceSpec: {
                    summary: 'Invalid Kubernetes resource specification',
                    description:
                      'Returned when the generated YAML contains invalid resource specifications',
                    value: {
                      message: 'Failed to create instance: invalid resource specification',
                      error: 'Invalid value: "invalid-port": spec.ports[0].port'
                    }
                  },
                  resourceQuotaExceeded: {
                    summary: 'Resource quota exceeded',
                    description: 'Returned when the requested resources exceed the namespace quota',
                    value: {
                      message: 'Failed to create instance: invalid resource specification',
                      error:
                        'exceeded quota: default, requested: cpu=4, used: cpu=8, limited: cpu=10'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: createInstanceSchemas.errorResponse,
                examples: {
                  k8sApiError: {
                    summary: 'Kubernetes API error',
                    description:
                      'Returned when an unexpected error occurs while communicating with Kubernetes API',
                    value: {
                      message: 'Failed to create instance in Kubernetes',
                      error: 'Unexpected error from Kubernetes API'
                    }
                  },
                  yamlGenerationError: {
                    summary: 'YAML generation failed',
                    description:
                      'Returned when template YAML generation fails due to internal error',
                    value: {
                      message: 'Failed to create instance',
                      error: 'Template parsing error'
                    }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable - Kubernetes cluster unavailable',
            content: {
              'application/json': {
                schema: createInstanceSchemas.errorResponse,
                examples: {
                  clusterUnavailable: {
                    summary: 'Kubernetes cluster is temporarily unavailable',
                    description:
                      'Returned when the Kubernetes cluster cannot be reached due to network issues or cluster downtime',
                    value: {
                      message: 'Kubernetes cluster is temporarily unavailable',
                      error: 'connect ECONNREFUSED 10.0.0.1:6443'
                    }
                  },
                  connectionTimeout: {
                    summary: 'Connection to cluster timed out',
                    description: 'Returned when the connection to Kubernetes cluster times out',
                    value: {
                      message: 'Kubernetes cluster is temporarily unavailable',
                      error: 'ETIMEDOUT: connection timed out'
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
