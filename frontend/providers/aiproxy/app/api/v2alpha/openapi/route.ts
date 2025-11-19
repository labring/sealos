import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2alpha/openapi
 * Returns OpenAPI 3.0 specification for v2alpha API
 */
export async function GET() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'AIProxy Token Management API',
      version: '2.0.0-alpha',
      description: `
# AIProxy Token Management API

This API provides endpoints for managing AI service tokens.

## API Design Principles

### Query vs Mutation

- **Query**: Read-only operations that retrieve data
  - Success: Returns \`200 OK\` with data in response body
  - Failure: Returns \`4XX\` or \`5XX\` with error details

- **Mutation**: Operations that modify data (create, update, delete)
  - Success: Returns \`204 No Content\` with empty response body
  - Failure: Returns \`4XX\` or \`5XX\` with error details

### Authentication

All endpoints require authentication via Bearer token or Kubernetes config in the Authorization header.
      `,
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: '/api/v2alpha',
        description: 'V2 Alpha API Server',
      },
    ],
    tags: [
      {
        name: 'Query',
        description: 'Query operations - retrieve data (returns 200 OK with data)',
      },
      {
        name: 'Mutation',
        description: 'Mutation operations - modify data (returns 204 No Content)',
      },
    ],
    paths: {
      '/token': {
        post: {
          tags: ['Mutation'],
          summary: 'Create a new token',
          description: `
Create a new API token for accessing AI services.

**Operation Type**: Mutation

**Success Response**: \`204 No Content\` - Token created successfully (no response body)

**Authentication Required**: Yes
          `,
          operationId: 'createToken',
          security: [
            {
              BearerAuth: [],
            },
            {
              KubeConfigAuth: [],
            },
          ],
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
            '204': {
              description: 'Token created successfully (no content)',
            },
            '400': {
              description: 'Bad request - validation failed',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  examples: {
                    validation_error: {
                      summary: 'Validation error',
                      value: {
                        code: 400,
                        message: 'Validation failed',
                        error: 'Token name is required',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized - invalid or missing authentication',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  examples: {
                    unauthorized: {
                      summary: 'Authentication failed',
                      value: {
                        code: 401,
                        message: 'Unauthorized',
                        error: 'Auth: Token is missing',
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  examples: {
                    server_error: {
                      summary: 'Server error',
                      value: {
                        code: 500,
                        message: 'Internal server error',
                        error: 'Failed to create token',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/token/{name}': {
        delete: {
          tags: ['Mutation'],
          summary: 'Delete a token by name',
          description: `
Delete a specific token by its name.

**Operation Type**: Mutation

**Success Response**: \`204 No Content\` - Token deleted successfully (no response body)

**Authentication Required**: Yes

**Note**: This operation is irreversible. The deleted token cannot be recovered.
          `,
          operationId: 'deleteToken',
          security: [
            {
              BearerAuth: [],
            },
            {
              KubeConfigAuth: [],
            },
          ],
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              description: 'Token name to delete',
              schema: {
                type: 'string',
                minLength: 1,
              },
              example: 'my-api-token',
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
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  examples: {
                    validation_error: {
                      summary: 'Invalid token name',
                      value: {
                        code: 400,
                        message: 'Validation failed',
                        error: 'Token name is required',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized - invalid or missing authentication',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
            '404': {
              description: 'Token not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  examples: {
                    not_found: {
                      summary: 'Token does not exist',
                      value: {
                        code: 404,
                        message: 'Token not found',
                        error: 'The specified token does not exist',
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/token/search': {
        get: {
          tags: ['Query'],
          summary: 'Search tokens',
          description: `
Search and retrieve tokens.

**Operation Type**: Query

**Success Response**: \`200 OK\` with token data in response body

**Default Behavior** (no parameters):
- Returns first 10 tokens
- Sorted by creation time (newest first)

**With name parameter**:
- Returns specific token matching the name
- Returns 404 if token not found

**Authentication Required**: Yes
          `,
          operationId: 'searchTokens',
          security: [
            {
              BearerAuth: [],
            },
            {
              KubeConfigAuth: [],
            },
          ],
          parameters: [
            {
              name: 'name',
              in: 'query',
              required: false,
              description: 'Token name to search for (exact match)',
              schema: {
                type: 'string',
              },
              example: 'my-api-token',
            },
          ],
          responses: {
            '200': {
              description: 'Tokens retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/TokenSearchResponse',
                  },
                  examples: {
                    default_list: {
                      summary: 'Default list (first 10 tokens)',
                      value: [
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
                          }
                        ]
                    },
                    specific_token: {
                      summary: 'Search by name',
                      value: [
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
                          }
                        ],
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
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized - invalid or missing authentication',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
            '404': {
              description: 'Token not found (when searching by name)',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  examples: {
                    not_found: {
                      summary: 'Token not found',
                      value: {
                        code: 404,
                        message: 'Token not found',
                        error: 'The specified token does not exist',
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
        KubeConfigAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Kubernetes config string for authentication',
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
              description: 'Token key (partially masked for security)',
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
              type: 'array',
              nullable: true,
              description:
                'List of allowed AI models (null means all models are allowed)',
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
              description:
                'Expiration timestamp (Unix epoch in seconds, -1 means never expires)',
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
        TokenSearchResponse: {
          type: 'object',
          description: 'Token search response',
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
        ErrorResponse: {
          type: 'object',
          description: 'Error response',
          properties: {
            code: {
              type: 'integer',
              description: 'HTTP status code',
              example: 400,
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Validation failed',
            },
            error: {
              type: 'string',
              description: 'Detailed error description',
              example: 'Token name is required',
            },
          },
          required: ['code', 'message', 'error'],
        },
      },
    },
  }

  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

