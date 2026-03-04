import { NextResponse } from 'next/server'

import {
  createError400Schema,
  createError401Schema,
  createError404Schema,
  createError500Schema,
  createErrorExample,
  ErrorCode,
  ErrorType,
} from '@/lib/v2alpha/error'
import { zodToJsonSchema } from 'zod-to-json-schema'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2alpha/openapi
 * Returns OpenAPI 3.0 specification for v2alpha API
 */
export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'AIProxy Token Management API',
      version: '2.0.0-alpha',
      description: `AIProxy is the Sealos AI gateway. This API lets you manage API tokens that authenticate calls to AI models.

## Authentication

All endpoints require one of two credential types in the \`Authorization\` header:

- **Sealos App Token** (a Sealos-issued signed token): \`Authorization: Bearer <appToken>\`
- **Kubeconfig** (URL-encoded YAML): \`Authorization: <encodeURIComponent(kubeconfigYaml)>\`

Obtain your App Token or kubeconfig from the Sealos console.

## Errors

All error responses follow a unified format:

\`\`\`json
{
  "error": {
    "type": "validation_error",
    "code": "INVALID_PARAMETER",
    "message": "Token name is required.",
    "details": [{ "field": "name", "message": "Required" }]
  }
}
\`\`\`

- \`type\` — high-level category (e.g. \`validation_error\`, \`resource_error\`, \`internal_error\`)
- \`code\` — stable identifier for programmatic handling
- \`message\` — human-readable explanation
- \`details\` — optional extra context; shape varies by \`code\` (field list, string, or object)

## Operations

**Query** (read-only): returns \`200 OK\` with data in the response body.

**Mutation** (write): Create → \`201 Created\` with the created resource. Update/Delete → \`204 No Content\`.`,
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v2alpha',
        description: 'Local development',
      },
      {
        url: '/api/v2alpha',
        description: 'Production (same origin)',
      },
      {
        url: '{baseUrl}/api/v2alpha',
        description: 'Custom',
        variables: {
          baseUrl: {
            default: 'https://aiproxy.example.com',
            description: 'Base URL of your instance (e.g. https://aiproxy.192.168.x.x.nip.io)',
          },
        },
      },
    ],
    tags: [
      {
        name: 'Query',
        description: 'Read-only operations. Success: `200 OK` with data in the response body.',
      },
      {
        name: 'Mutation',
        description:
          'Write operations. Create: `201 Created` with the new resource. Update/Delete: `204 No Content`.',
      },
    ],
    paths: {
      '/tokens': {
        get: {
          tags: ['Query'],
          summary: 'List tokens',
          description: `Lists tokens with optional partial-name filtering and pagination.

Key points:
- Default: returns the first 10 tokens (page 1)
- \`name\` parameter performs a **partial (fuzzy) match**; may return multiple results
- For an exact name lookup, use \`GET /tokens/{name}\``,
          operationId: 'listTokens',
          parameters: [
            {
              name: 'name',
              in: 'query',
              required: false,
              description:
                'Filter tokens by name (partial/fuzzy match). Returns all tokens whose name contains this string. For an exact lookup, use `GET /tokens/{name}`.',
              schema: {
                type: 'string',
              },
              example: 'my-api',
            },
            {
              name: 'page',
              in: 'query',
              required: false,
              description: 'Page number (default: 1)',
              schema: {
                type: 'integer',
                minimum: 1,
                default: 1,
              },
              example: 1,
            },
            {
              name: 'perPage',
              in: 'query',
              required: false,
              description: 'Number of items per page (default: 10, max: 100)',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 10,
              },
              example: 10,
            },
          ],
          responses: {
            '200': {
              description: 'Tokens retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/TokenListResponse',
                  },
                  examples: {
                    default_list: {
                      summary: 'Default list (first 10 tokens)',
                      value: {
                        tokens: [
                          {
                            id: 123,
                            name: 'production-token',
                            key: 'sk-****abc123',
                            group: 'ns-admin',
                            subnet: '0.0.0.0/0',
                            models: ['gpt-4', 'gpt-3.5-turbo'],
                            status: 1,
                            quota: 1000.0,
                            used_amount: 250.5,
                            request_count: 500,
                            created_at: 1697001600,
                            accessed_at: 1697088000,
                            expired_at: -1,
                          },
                        ],
                        total: 1,
                      },
                    },
                    filtered_by_name: {
                      summary: 'Filter by name',
                      value: {
                        tokens: [
                          {
                            id: 123,
                            name: 'my-api-token',
                            key: 'sk-****abc123',
                            group: 'ns-admin',
                            subnet: '0.0.0.0/0',
                            models: null,
                            status: 1,
                            quota: 500.0,
                            used_amount: 100.0,
                            request_count: 200,
                            created_at: 1697001600,
                            accessed_at: 1697088000,
                            expired_at: -1,
                          },
                        ],
                        total: 1,
                      },
                    },
                    empty_list: {
                      summary: 'No tokens found',
                      value: {
                        tokens: [],
                        total: 0,
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request - invalid query parameters',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError400Schema(), { target: 'openApi3' }),
                  examples: {
                    validation_error: {
                      summary: 'Invalid query parameters (page, perPage)',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid query parameters.',
                        [{ field: 'page', message: 'Page must be at least 1' }]
                      ),
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized - invalid or missing authentication',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError401Schema(), { target: 'openApi3' }),
                  examples: {
                    unauthorized: {
                      summary: 'Authentication failed',
                      value: createErrorExample(
                        ErrorType.AUTHENTICATION_ERROR,
                        ErrorCode.AUTHENTICATION_REQUIRED,
                        'Unauthorized, please login again.',
                        'Auth: Token is missing'
                      ),
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError500Schema(), { target: 'openApi3' }),
                  examples: {
                    server_error: {
                      summary: 'Server error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to list tokens.',
                        'Backend auth key is not configured'
                      ),
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Mutation'],
          summary: 'Create a new token',
          description: `Creates a new API token for accessing AI services.

Always returns \`201\`. If a token with the given name already exists it is returned as-is rather than producing an error.`,
          operationId: 'createToken',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Token name (must be unique within the group)',
                      minLength: 1,
                      maxLength: 100,
                      example: 'my-api-token',
                    },
                  },
                },
                examples: {
                  basic: {
                    summary: 'Basic token creation',
                    value: {
                      name: 'production-token',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Token created or returned as-is if it already existed.',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/TokenInfo',
                  },
                  examples: {
                    created: {
                      summary: 'Token created',
                      value: {
                        id: 124,
                        name: 'production-token',
                        key: 'sk-abcdefgh1234567890',
                        group: 'ns-admin',
                        subnet: '0.0.0.0/0',
                        models: null,
                        status: 1,
                        quota: 0,
                        used_amount: 0,
                        request_count: 0,
                        created_at: 1697001600,
                        accessed_at: 1697001600,
                        expired_at: -1,
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request - validation failed',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError400Schema(), { target: 'openApi3' }),
                  examples: {
                    invalid_json: {
                      summary: 'Invalid JSON body',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Request body must be valid JSON.'
                      ),
                    },
                    validation_error: {
                      summary: 'Validation error (name required/format)',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid request body.',
                        [{ field: 'name', message: 'Token name is required' }]
                      ),
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized - invalid or missing authentication',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError401Schema(), { target: 'openApi3' }),
                  examples: {
                    unauthorized: {
                      summary: 'Authentication failed',
                      value: createErrorExample(
                        ErrorType.AUTHENTICATION_ERROR,
                        ErrorCode.AUTHENTICATION_REQUIRED,
                        'Unauthorized, please login again.',
                        'Auth: Token is missing'
                      ),
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError500Schema(), { target: 'openApi3' }),
                  examples: {
                    server_error: {
                      summary: 'Server error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to create token.',
                        'Backend service URL is not configured'
                      ),
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/tokens/{name}': {
        get: {
          tags: ['Query'],
          summary: 'Get a token by name',
          description: `Retrieves a single token by its exact name.

Key points:
- Matching is **exact and case-sensitive**
- For a partial-name search, use \`GET /tokens?name=...\``,
          operationId: 'getToken',
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              description: 'Exact token name to retrieve (case-sensitive, 1–100 characters).',
              schema: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
                example: 'my-api-token',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Token retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TokenInfo' },
                  examples: {
                    token: {
                      summary: 'Token details',
                      value: {
                        id: 123,
                        name: 'my-api-token',
                        key: 'sk-****abc123',
                        group: 'ns-admin',
                        subnet: '0.0.0.0/0',
                        models: ['gpt-4', 'gpt-3.5-turbo'],
                        status: 1,
                        quota: 1000.0,
                        used_amount: 250.5,
                        request_count: 500,
                        created_at: 1697001600,
                        accessed_at: 1697088000,
                        expired_at: -1,
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request - invalid token name',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError400Schema(), { target: 'openApi3' }),
                  examples: {
                    validation_error: {
                      summary: 'Token name fails validation',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid token name.',
                        [{ field: 'name', message: 'Token name is required' }]
                      ),
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized - invalid or missing authentication',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError401Schema(), { target: 'openApi3' }),
                  examples: {
                    unauthorized: {
                      summary: 'Authentication failed',
                      value: createErrorExample(
                        ErrorType.AUTHENTICATION_ERROR,
                        ErrorCode.AUTHENTICATION_REQUIRED,
                        'Unauthorized, please login again.',
                        'Auth: Token is missing'
                      ),
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Token not found',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError404Schema(), { target: 'openApi3' }),
                  examples: {
                    not_found: {
                      summary: 'No token with this exact name exists',
                      value: createErrorExample(
                        ErrorType.RESOURCE_ERROR,
                        ErrorCode.NOT_FOUND,
                        'The specified token does not exist.'
                      ),
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError500Schema(), { target: 'openApi3' }),
                  examples: {
                    server_error: {
                      summary: 'Server error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to get token.',
                        'HTTP error! status: 502'
                      ),
                    },
                  },
                },
              },
            },
          },
        },
        delete: {
          tags: ['Mutation'],
          summary: 'Delete a token by name',
          description: `Permanently deletes a token by its exact name.

Key points:
- Matching is **exact and case-sensitive**
- Returns \`204\` even if the token does not exist (idempotent)
- **Irreversible**`,
          operationId: 'deleteToken',
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              description: 'Exact token name to delete (case-sensitive, 1–100 characters).',
              schema: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
                example: 'my-api-token',
              },
            },
          ],
          responses: {
            '204': {
              description: 'Token deleted successfully (no content)',
            },
            '400': {
              description: 'Bad request - invalid token name',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError400Schema(), { target: 'openApi3' }),
                  examples: {
                    validation_error: {
                      summary: 'Invalid token name',
                      value: createErrorExample(
                        ErrorType.VALIDATION_ERROR,
                        ErrorCode.INVALID_PARAMETER,
                        'Invalid token name.',
                        [{ field: 'name', message: 'Token name is required' }]
                      ),
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized - invalid or missing authentication',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError401Schema(), { target: 'openApi3' }),
                  examples: {
                    unauthorized: {
                      summary: 'Authentication failed',
                      value: createErrorExample(
                        ErrorType.AUTHENTICATION_ERROR,
                        ErrorCode.AUTHENTICATION_REQUIRED,
                        'Unauthorized, please login again.',
                        'Auth: Token is missing'
                      ),
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(createError500Schema(), { target: 'openApi3' }),
                  examples: {
                    server_error: {
                      summary: 'Server error',
                      value: createErrorExample(
                        ErrorType.INTERNAL_ERROR,
                        ErrorCode.INTERNAL_ERROR,
                        'Failed to delete token.',
                        'HTTP error! status: 502'
                      ),
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    // Root-level security: either credential type is accepted (OR semantics)
    security: [{ sealosAppToken: [] }, { kubeconfigAuth: [] }],
    components: {
      securitySchemes: {
        sealosAppToken: {
          type: 'http',
          scheme: 'bearer',
          description:
            'Sealos-issued App Token (a signed token specific to the Sealos platform). ' +
            'Obtain from the Sealos console. ' +
            'Header: `Authorization: Bearer <appToken>`',
        },
        kubeconfigAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description:
            'URL-encoded kubeconfig YAML. ' +
            'Header: `Authorization: <encodeURIComponent(kubeconfigYaml)>`',
        },
      },
      schemas: {
        TokenInfo: {
          type: 'object',
          description: 'Token information',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique token ID',
              example: 123,
            },
            name: {
              type: 'string',
              description: 'Token name',
              example: 'my-api-token',
            },
            key: {
              type: 'string',
              description: 'API key.',
              example: 'sk-****abc123',
            },
            group: {
              type: 'string',
              description: 'User group the token belongs to',
              example: 'ns-admin',
            },
            subnet: {
              type: 'string',
              description: 'Allowed subnet for API access',
              example: '0.0.0.0/0',
            },
            models: {
              type: ['array', 'null'],
              description: 'List of allowed AI models (null means all models are allowed)',
              items: {
                type: 'string',
              },
              example: ['gpt-4', 'gpt-3.5-turbo'],
            },
            status: {
              type: 'integer',
              description: 'Token status (1=enabled, 2=disabled)',
              enum: [1, 2],
              example: 1,
            },
            quota: {
              type: 'number',
              format: 'float',
              description: 'Total quota allocated to the token',
              example: 1000.0,
            },
            used_amount: {
              type: 'number',
              format: 'float',
              description: 'Amount of quota already used',
              example: 250.5,
            },
            request_count: {
              type: 'integer',
              description: 'Total number of API requests made',
              example: 500,
            },
            created_at: {
              type: 'integer',
              format: 'int64',
              description: 'Creation timestamp (Unix epoch in seconds)',
              example: 1697001600,
            },
            accessed_at: {
              type: 'integer',
              format: 'int64',
              description: 'Last access timestamp (Unix epoch in seconds)',
              example: 1697088000,
            },
            expired_at: {
              type: 'integer',
              format: 'int64',
              description: 'Expiration timestamp (Unix epoch in seconds, -1 means never expires)',
              example: -1,
            },
          },
          required: [
            'id',
            'name',
            'key',
            'group',
            'subnet',
            'status',
            'quota',
            'used_amount',
            'request_count',
            'created_at',
            'accessed_at',
            'expired_at',
          ],
        },
        TokenListResponse: {
          type: 'object',
          description: 'Token list response',
          properties: {
            tokens: {
              type: 'array',
              description: 'List of tokens',
              items: {
                $ref: '#/components/schemas/TokenInfo',
              },
            },
            total: {
              type: 'integer',
              description: 'Total number of tokens matching the search criteria',
              example: 10,
            },
          },
          required: ['tokens', 'total'],
        },
      },
    },
  }

  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="openapi.json"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
