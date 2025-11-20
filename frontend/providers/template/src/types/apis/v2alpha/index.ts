import * as z from 'zod';
import { createDocument } from 'zod-openapi';

import * as listTemplateSchemas from './list-template';
import * as getTemplateSchemas from './get-template';
import * as createTemplateSchemas from './create-template';
import * as commonSchemas from './common/schema';

export * as listTemplateSchemas from './list-template';
export * as getTemplateSchemas from './get-template';
export * as createTemplateSchemas from './create-template';
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
        description: 'Kubernetes config authentication token'
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
                example: {
                  message: "Template 'nonexistent' not found"
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
            description: 'Template not found',
            content: {
              'application/json': {
                schema: commonSchemas.BaseResponseSchema.extend({
                  code: z.literal(404)
                }),
                example: {
                  message: "Template 'nonexistent' not found"
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
    }
  }
});
