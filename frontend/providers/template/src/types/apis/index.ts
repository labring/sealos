import * as z from 'zod';
import { createDocument } from 'zod-openapi';

import * as deleteInstanceSchemas from './delete-instance';
import * as listTemplateSchemas from './list-template';
import * as getTemplateSchemas from './get-template';

export * as deleteInstanceSchemas from './delete-instance';
export * as listTemplateSchemas from './list-template';
export * as getTemplateSchemas from './get-template';

export const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Sealos Template API',
    version: '1.0.0',
    description: `
# Sealos Template API Documentation

This API provides endpoints for managing application templates and instances in the Sealos platform.

## API Groups

### Query Operations
Read-only operations for retrieving template and instance information.

### Mutation Operations
Operations that modify data, such as creating or deleting instances.

## Response Format

All responses follow a consistent format:

**Success Response:**
\`\`\`json
{
  "code": 200,
  "data": { ... },
  "message": "Optional success message"
}
\`\`\`

**Error Response:**
\`\`\`json
{
  "code": 400 | 404 | 500,
  "message": "Error description",
  "error": { ... }
}
\`\`\`

## Error Codes

- \`200\` - Success
- \`400\` - Bad Request (invalid parameters)
- \`404\` - Not Found (resource doesn't exist)
- \`500\` - Internal Server Error
    `
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Local development server'
    },
    {
      url: 'https://template.example.com/api/v1',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      KubeconfigAuth: {
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
- **Category Menu**: Includes top categories for sidebar menu

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
                example: {
                  code: 200,
                  data: {
                    templates: [
                      {
                        name: 'perplexica',
                        uid: 'xxx-xxx-xxx',
                        resourceType: 'template',
                        readme:
                          'https://raw.githubusercontent.com/ItzCrazyKns/Perplexica/master/README.md',
                        icon: 'https://raw.githubusercontent.com/ItzCrazyKns/Perplexica/refs/heads/master/src/app/favicon.ico',
                        description: 'AI-powered search engine',
                        gitRepo: 'https://github.com/ItzCrazyKns/Perplexica',
                        category: ['ai'],
                        input: {
                          OPENAI_API_KEY: {
                            description: 'OpenAI API Key',
                            type: 'string',
                            default: '',
                            required: true
                          }
                        },
                        deployCount: 156
                      }
                    ],
                    menuKeys: 'ai,database,tool'
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: z.object({
                  code: z.literal(500),
                  message: z.string(),
                  error: z.any()
                }),
                example: {
                  code: 500,
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
                  code: 200,
                  data: {
                    name: 'perplexica',
                    uid: 'xxx-xxx-xxx',
                    resourceType: 'template',
                    resource: {
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
                    input: {
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
          },
          '404': {
            description: 'Template not found',
            content: {
              'application/json': {
                schema: z.object({
                  code: z.literal(404),
                  message: z.string()
                }),
                example: {
                  code: 404,
                  message: "Template 'nonexistent' not found"
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: z.object({
                  code: z.literal(500),
                  message: z.string(),
                  error: z.any()
                }),
                example: {
                  code: 500,
                  message: 'Failed to get template details',
                  error: 'YAML parsing error'
                }
              }
            }
          }
        }
      }
    },
    '/instance/{instanceName}': {
      delete: {
        tags: ['Mutation'],
        summary: 'Delete Instance',
        description: `
## Overview
Delete a deployed template instance and all its dependent Kubernetes resources.

## Features
- **Authentication Required**: Requires valid kubeconfig authentication
- **Complete Cleanup**: Removes all associated resources (Deployments, Services, PVCs, etc.)
- **Safe Deletion**: Validates instance existence before deletion
- **Namespace Isolation**: Only deletes resources within the user's namespace

## Deletion Process
1. Authenticates user via kubeconfig header
2. Validates instance exists in user's namespace
3. Deletes all labeled resources:
   - Deployments
   - StatefulSets
   - Services
   - ConfigMaps
   - Secrets
   - PersistentVolumeClaims
   - Ingresses
4. Returns success confirmation

## Use Cases
- Clean up unused template instances
- Remove failed deployments
- Free up cluster resources

## Important Notes
- ⚠️ **Irreversible**: Deletion cannot be undone
- ⚠️ **Data Loss**: All associated data will be permanently deleted
- ⚠️ **Namespace Scoped**: Only affects resources in the user's namespace
        `,
        operationId: 'deleteInstance',
        security: [{ KubeconfigAuth: [] }],
        requestParams: {
          path: deleteInstanceSchemas.pathParams
        },
        responses: {
          '200': {
            description: 'Instance successfully deleted',
            content: {
              'application/json': {
                schema: deleteInstanceSchemas.response,
                example: {
                  code: 200,
                  message: 'Instance deleted successfully'
                }
              }
            }
          },
          '401': {
            description: 'Authentication failed',
            content: {
              'application/json': {
                schema: z.object({
                  code: z.literal(401),
                  message: z.string()
                }),
                example: {
                  code: 401,
                  message: 'Invalid or missing kubeconfig'
                }
              }
            }
          },
          '404': {
            description: 'Instance not found',
            content: {
              'application/json': {
                schema: z.object({
                  code: z.literal(404),
                  message: z.string()
                }),
                example: {
                  code: 404,
                  message: 'Instance not found in namespace'
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: z.object({
                  code: z.literal(500),
                  message: z.string(),
                  error: z.any()
                }),
                example: {
                  code: 500,
                  message: 'Failed to delete instance',
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
