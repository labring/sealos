import { createDocument } from 'zod-openapi';
import { z } from 'zod';
import {
  createError400Schema,
  createError401Schema,
  createError403Schema,
  createError404Schema,
  createError409Schema,
  createError500Schema,
  createError503Schema,
  ErrorType,
  ErrorCode,
  createErrorExample
} from '@/types/v2alpha/error';
import { dbEditSchema, dbStatusSchema } from '@/types/schemas/v2alpha/db';

import * as createDatabaseSchemas from './database/create-database';
export * as createDatabaseSchemas from './database/create-database';

import * as updateDatabaseSchemas from './database/update-database';
export * as updateDatabaseSchemas from './database/update-database';

import * as startDatabaseSchemas from './database/start-database';
export * as startDatabaseSchemas from './database/start-database';

import * as pauseDatabaseSchemas from './database/pause-database';
export * as pauseDatabaseSchemas from './database/pause-database';

import * as restartDatabaseSchemas from './database/restart-database';
export * as restartDatabaseSchemas from './database/restart-database';

import * as getDatabaseSchemas from './database/get-database';
export * as getDatabaseSchemas from './database/get-database';

import * as deleteDatabaseSchemas from './database/delete-database';
export * as deleteDatabaseSchemas from './database/delete-database';

import * as logsDataSchemas from './logs/data';
export * as logsDataSchemas from './logs/data';

import * as logsFileSchemas from './logs/file';
export * as logsFileSchemas from './logs/file';

import * as databaseVersionListSchemas from './database/version/list';
export * as databaseVersionListSchemas from './database/version/list';

import * as enablePublicAccessSchemas from './network/enable-public-access';
export * as enablePublicAccessSchemas from './network/enable-public-access';

import * as disablePublicAccessSchemas from './network/disable-public-access';
export * as disablePublicAccessSchemas from './network/disable-public-access';

const getDatabaseResponseJsonSchema = {
  type: 'object',
  properties: {
    terminationPolicy: {
      type: 'string',
      enum: ['delete', 'wipeout'],
      default: 'delete',
      description:
        'Cluster termination policy. "delete" removes the cluster but keeps PVCs, "wipeout" removes everything including data.',
      example: 'delete'
    },
    name: {
      type: 'string',
      minLength: 1,
      description: 'Database name (Kubernetes resource name — lowercase alphanumeric and hyphens)',
      example: 'my-postgres-db'
    },
    type: {
      type: 'string',
      enum: [
        'postgresql',
        'mongodb',
        'apecloud-mysql',
        'redis',
        'kafka',
        'qdrant',
        'nebula',
        'weaviate',
        'milvus',
        'pulsar',
        'clickhouse'
      ],
      description: 'Database engine type',
      example: 'postgresql'
    },
    version: {
      type: 'string',
      description: 'Database version string (e.g. "postgresql-14.8.0")',
      example: 'postgresql-14.8.0'
    },
    quota: {
      type: 'object',
      description: 'Resource allocation for each database replica',
      properties: {
        cpu: { type: 'number', description: 'CPU cores per replica', example: 1 },
        memory: { type: 'number', description: 'Memory in GB per replica', example: 2 },
        storage: { type: 'number', description: 'Storage in GB per replica', example: 5 },
        replicas: { type: 'number', description: 'Number of database replicas', example: 1 }
      }
    },
    autoBackup: {
      type: 'object',
      description: 'Automatic backup configuration',
      properties: {
        start: {
          type: 'boolean',
          description: 'Whether automatic backups are enabled',
          example: true
        },
        type: {
          type: 'string',
          enum: ['day', 'hour', 'week'],
          description: 'Backup frequency type',
          example: 'day'
        },
        week: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
          },
          description: 'Days of the week for weekly backups',
          example: ['monday']
        },
        hour: {
          type: 'string',
          description: 'Hour to run backup (24-hour format)',
          example: '02'
        },
        minute: { type: 'string', description: 'Minute to run backup', example: '00' },
        saveTime: {
          type: 'number',
          description: 'Backup retention duration',
          example: 7
        },
        saveType: {
          type: 'string',
          enum: ['days', 'hours', 'weeks', 'months'],
          description: 'Backup retention unit',
          example: 'days'
        }
      }
    },
    parameterConfig: {
      type: 'object',
      description: 'Database-specific parameter configuration',
      properties: {
        maxConnections: {
          type: 'string',
          description: 'Maximum number of database connections',
          example: '100'
        },
        timeZone: {
          type: 'string',
          description: 'Database timezone',
          example: 'Asia/Shanghai'
        },
        lowerCaseTableNames: {
          type: 'string',
          enum: ['0', '1'],
          description:
            'MySQL-specific: case sensitivity for table names. 0=case-sensitive, 1=case-insensitive',
          example: '0'
        },
        maxmemory: {
          type: 'string',
          description: 'Redis-specific: maximum memory usage',
          example: '512mb'
        }
      }
    },
    uid: {
      type: 'string',
      description: 'Unique identifier of the database resource',
      example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    },
    status: {
      type: 'string',
      enum: [
        'creating',
        'starting',
        'stopping',
        'stopped',
        'running',
        'updating',
        'specUpdating',
        'rebooting',
        'upgrade',
        'verticalScaling',
        'volumeExpanding',
        'failed',
        'unknown',
        'deleting'
      ],
      description: 'Current status of the database cluster',
      example: 'running'
    },
    createdAt: {
      type: 'string',
      description: 'Creation timestamp of the database cluster (ISO 8601)',
      example: '2024-01-15T10:30:00Z'
    },
    resourceType: {
      type: 'string',
      description: 'Resource type identifier — always "cluster"',
      default: 'cluster',
      example: 'cluster'
    },
    operationalStatus: {
      type: 'object',
      description: 'Operational status flags from KubeBlocks (structure varies by version)',
      additionalProperties: true,
      example: {}
    },
    connection: {
      type: 'object',
      description: 'Connection details for the database cluster',
      properties: {
        privateConnection: {
          description: 'Internal (in-cluster) connection details. null if not yet available.',
          oneOf: [
            {
              type: 'object',
              properties: {
                endpoint: {
                  type: 'string',
                  description: 'host:port string for internal cluster access',
                  example: 'my-postgres-db-postgresql.ns-abc.svc.cluster.local:5432'
                },
                host: {
                  type: 'string',
                  description: 'ClusterIP service hostname (internal only)',
                  example: 'my-postgres-db-postgresql.ns-abc.svc.cluster.local'
                },
                port: { type: 'string', description: 'Database port', example: '5432' },
                username: {
                  type: 'string',
                  description: 'Database username',
                  example: 'postgres'
                },
                password: {
                  type: 'string',
                  description: 'Database password',
                  example: 's3cr3tpassword'
                },
                connectionString: {
                  type: 'string',
                  description: 'Ready-to-use connection string',
                  example:
                    'postgresql://postgres:s3cr3tpassword@my-postgres-db-postgresql.ns-abc.svc.cluster.local:5432/postgres'
                }
              }
            },
            { type: 'null' }
          ]
        },
        publicConnection: {
          description:
            'External connection string via NodePort/LoadBalancer. null if public access is not enabled.',
          oneOf: [
            {
              type: 'string',
              example: 'postgresql://postgres:s3cr3tpassword@203.0.113.1:30001/postgres'
            },
            { type: 'null' }
          ]
        }
      }
    },
    pods: {
      type: 'array',
      description: 'List of database pods and their current phase',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Pod name',
            example: 'my-postgres-db-postgresql-0'
          },
          status: {
            type: 'string',
            description: 'Pod phase (e.g. "running", "pending", "failed")',
            example: 'running'
          }
        }
      }
    }
  }
};

export const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Database API',
    version: '2.0.0-alpha',
    description:
      'Manage database instances (PostgreSQL, MySQL, Redis, MongoDB, and more) on Kubernetes via KubeBlocks.\n\n' +
      '## Authentication\n\n' +
      'All endpoints require a URL-encoded kubeconfig in the `Authorization` header. ' +
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
      '**Mutation** (write):\n\n' +
      '- **Create** → `201 Created` with `{ "name": "...", "status": "creating" }`. ' +
      'The Kubernetes resource is created synchronously; the cluster is provisioned in the background. ' +
      'Poll `GET /databases/{name}` until `status` is `"Running"`.\n' +
      '- **Update / Delete / Action** → `204 No Content` with no response body.'
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v2alpha',
      description: 'Local development'
    },
    {
      url: 'https://dbprovider.example.com/api/v2alpha',
      description: 'Production'
    },
    {
      url: '{baseUrl}/api/v2alpha',
      description: 'Custom',
      variables: {
        baseUrl: {
          default: 'https://dbprovider.example.com',
          description: 'Base URL of your instance (e.g. https://dbprovider.192.168.x.x.nip.io)'
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
    },
    schemas: {
      UpdateResourceSchema: {
        type: 'object',
        properties: {
          cpu: {
            type: 'number',
            enum: [1, 2, 3, 4, 5, 6, 7, 8],
            description:
              'CPU cores. Allowed values: 1, 2, 3, 4, 5, 6, 7, or 8 (converted to millicores in K8s)',
            example: 2
          },
          memory: {
            type: 'number',
            enum: [1, 2, 4, 6, 8, 12, 16, 32],
            description:
              'Memory in GB. Allowed values: 1, 2, 4, 6, 8, 12, 16, or 32 GB (converted to Gi in K8s)',
            example: 4
          },
          storage: {
            type: 'number',
            minimum: 1,
            maximum: 300,
            description:
              'Storage in GB (1–300). Storage can only be expanded, not shrunk (converted to Gi in K8s)',
            example: 20
          },
          replicas: {
            type: 'integer',
            minimum: 1,
            maximum: 20,
            description: 'Number of replicas (1–20)',
            example: 2
          }
        },
        description: 'Resource configuration for database update. All fields are optional.'
      },
      K8sClusterResource: {
        type: 'object',
        description: 'Full Kubernetes cluster resource object',
        additionalProperties: true
      },
      OpsRequest: {
        type: 'object',
        properties: {
          apiVersion: {
            type: 'string',
            example: 'apps.kubeblocks.io/v1alpha1'
          },
          kind: {
            type: 'string',
            example: 'OpsRequest'
          },
          metadata: {
            type: 'object',
            properties: {
              name: {
                type: 'string'
              },
              namespace: {
                type: 'string'
              },
              labels: {
                type: 'object',
                additionalProperties: {
                  type: 'string'
                }
              }
            }
          },
          spec: {
            type: 'object',
            additionalProperties: true
          },
          status: {
            type: 'object',
            additionalProperties: true
          }
        }
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
        'Write operations. Create: `201 Created` with `{ name, status: "creating" }` (K8s resource created synchronously; poll GET to confirm running). Update/Delete/Action: `204 No Content`.'
    }
  ],
  paths: {
    '/databases': {
      post: {
        summary: 'Create database',
        description:
          'Provisions a new database cluster. The database is created asynchronously — the request returns immediately and the cluster becomes available shortly after.\n\n' +
          '**Example — PostgreSQL with daily backup:**\n' +
          '```json\n' +
          '{\n' +
          '  "name": "my-postgres-db",\n' +
          '  "type": "postgresql",\n' +
          '  "version": "postgresql-14.8.0",\n' +
          '  "quota": { "cpu": 1, "memory": 2, "storage": 5, "replicas": 1 },\n' +
          '  "autoBackup": {\n' +
          '    "start": true,\n' +
          '    "type": "day",\n' +
          '    "hour": "02",\n' +
          '    "minute": "00",\n' +
          '    "saveTime": 7,\n' +
          '    "saveType": "days"\n' +
          '  }\n' +
          '}\n' +
          '```\n\n' +
          '**Example — Redis (minimal):**\n' +
          '```json\n' +
          '{\n' +
          '  "name": "my-redis",\n' +
          '  "type": "redis",\n' +
          '  "quota": { "cpu": 1, "memory": 1, "storage": 3, "replicas": 1 }\n' +
          '}\n' +
          '```',
        operationId: 'createDatabase',
        tags: ['Mutation'],
        requestBody: {
          required: true,
          description:
            'Database configuration including type, version, resources, and optional backup/parameter settings',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type', 'quota'],
                properties: {
                  terminationPolicy: {
                    type: 'string',
                    enum: ['delete', 'wipeout'],
                    default: 'delete',
                    description:
                      'Cluster termination policy. "delete" removes the cluster but keeps PVCs, "wipeout" removes everything including data. Defaults to "delete" if not provided.',
                    example: 'delete'
                  },
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 63,
                    pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
                    description:
                      'Database name. Must be a valid Kubernetes resource name (lowercase alphanumeric and hyphens)',
                    example: 'my-postgres-db'
                  },
                  type: {
                    type: 'string',
                    enum: [
                      'postgresql',
                      'mongodb',
                      'apecloud-mysql',
                      'redis',
                      'kafka',
                      'qdrant',
                      'nebula',
                      'weaviate',
                      'milvus',
                      'pulsar',
                      'clickhouse'
                    ],
                    description: 'Database type/engine to deploy',
                    example: 'postgresql'
                  },
                  version: {
                    type: 'string',
                    description:
                      'Database version (e.g., "14.8.0" for PostgreSQL). Must match available versions from /databases/versions endpoint. If not provided, the latest version for the specified database type will be automatically selected.',
                    example: 'postgresql-14.8.0'
                  },
                  quota: {
                    type: 'object',
                    required: ['cpu', 'memory', 'storage', 'replicas'],
                    description:
                      'Resource allocation for the database cluster. All four fields are required.',
                    properties: {
                      cpu: {
                        type: 'number',
                        enum: [1, 2, 3, 4, 5, 6, 7, 8],
                        description:
                          'CPU cores allocated to each database instance. Allowed values: 1, 2, 3, 4, 5, 6, 7, or 8 (converted to millicores in Kubernetes)',
                        default: 1,
                        example: 1
                      },
                      memory: {
                        type: 'number',
                        minimum: 0.1,
                        maximum: 32,
                        description:
                          'Memory in GB allocated to each database instance - range [0.1, 32] (automatically converted to Gi in Kubernetes)',
                        default: 1,
                        example: 2
                      },
                      storage: {
                        type: 'number',
                        minimum: 1,
                        maximum: 300,
                        description:
                          'Persistent storage in GB for each database instance (automatically converted to Gi in Kubernetes)',
                        default: 3,
                        example: 5
                      },
                      replicas: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 20,
                        description: 'Number of database replicas for high availability',
                        default: 3,
                        example: 1
                      }
                    }
                  },
                  autoBackup: {
                    type: 'object',
                    description:
                      'Automatic backup configuration (optional). If not provided, no automatic backups will be configured',
                    properties: {
                      start: {
                        type: 'boolean',
                        description: 'Enable automatic backups',
                        example: true
                      },
                      type: {
                        type: 'string',
                        enum: ['day', 'hour', 'week'],
                        description: 'Backup frequency type',
                        example: 'day'
                      },
                      week: {
                        type: 'array',
                        items: {
                          type: 'string',
                          enum: [
                            'monday',
                            'tuesday',
                            'wednesday',
                            'thursday',
                            'friday',
                            'saturday',
                            'sunday'
                          ]
                        },
                        description: 'Days of the week to run backups (for weekly backups)',
                        example: ['monday']
                      },
                      hour: {
                        type: 'string',
                        pattern: '^([01]?[0-9]|2[0-3])$',
                        description: 'Hour to run backup (24-hour format, 00-23)',
                        example: '02'
                      },
                      minute: {
                        type: 'string',
                        pattern: '^[0-5]?[0-9]$',
                        description: 'Minute to run backup (00-59)',
                        example: '00'
                      },
                      saveTime: {
                        type: 'number',
                        minimum: 1,
                        maximum: 365,
                        description: 'Backup retention duration',
                        example: 7
                      },
                      saveType: {
                        type: 'string',
                        enum: ['days', 'hours', 'weeks', 'months'],
                        description: 'Backup retention unit',
                        example: 'days'
                      }
                    }
                  },
                  parameterConfig: {
                    type: 'object',
                    description:
                      'Database-specific parameter configuration (optional). Available parameters vary by database type',
                    properties: {
                      maxConnections: {
                        type: 'string',
                        description: 'Maximum number of database connections',
                        example: '100'
                      },
                      timeZone: {
                        type: 'string',
                        description: 'Database timezone (e.g., "Asia/Shanghai", "UTC")',
                        example: 'Asia/Shanghai'
                      },
                      lowerCaseTableNames: {
                        type: 'string',
                        enum: ['0', '1'],
                        description:
                          'MySQL-specific: whether table names are case-sensitive. 0=case-sensitive, 1=case-insensitive',
                        example: '0'
                      },
                      maxmemory: {
                        type: 'string',
                        description: 'Redis-specific: maximum memory usage in bytes',
                        example: '512mb'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description:
              'Database created. The Kubernetes Cluster resource has been created and provisioning is underway. ' +
              'Poll `GET /databases/{databaseName}` until `status` is `"Running"`.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'status'],
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Name of the created database',
                      example: 'my-postgres-db'
                    },
                    status: {
                      type: 'string',
                      enum: ['creating'],
                      description:
                        'Initial provisioning status — always "creating" at creation time',
                      example: 'creating'
                    }
                  }
                },
                example: { name: 'my-postgres-db', status: 'creating' }
              }
            }
          },
          '400': {
            description: 'Bad request — invalid body, resource values, or parameter configuration',
            content: {
              'application/json': {
                schema: createError400Schema([
                  ErrorCode.INVALID_PARAMETER,
                  ErrorCode.INVALID_VALUE
                ]),
                examples: {
                  invalidParameter: {
                    summary: 'Missing required field',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Request body validation failed.',
                      [{ field: 'quota', message: 'Required' }]
                    )
                  },
                  invalidValue: {
                    summary: 'Invalid CPU value',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_VALUE,
                      'Invalid CPU value. Must be one of: 1, 2, 3, 4, 5, 6, 7, 8 cores.'
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'clusters.apps.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot create resource "clusters" in API group "apps.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict — database with this name already exists',
            content: {
              'application/json': {
                schema: createError409Schema([ErrorCode.ALREADY_EXISTS, ErrorCode.CONFLICT]),
                examples: {
                  alreadyExists: {
                    summary: 'Database already exists',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.ALREADY_EXISTS,
                      'Resource already exists.',
                      'clusters.apps.kubeblocks.io "my-postgres-db" already exists'
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
                      'A Kubernetes API call failed.',
                      'admission webhook "resource.sealos.io" denied the request: resource quota exceeded'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      },
      get: {
        summary: 'List all databases',
        description:
          'Returns all database clusters in the current namespace with their status and resource allocation.',
        operationId: 'listDatabases',
        tags: ['Query'],
        responses: {
          '200': {
            description: 'List of databases retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Database name',
                        example: 'my-postgres-db'
                      },
                      uid: {
                        type: 'string',
                        description: 'Unique identifier',
                        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
                      },
                      type: {
                        type: 'string',
                        description: 'Database engine',
                        example: 'postgresql'
                      },
                      version: {
                        type: 'string',
                        description: 'Database version',
                        example: 'postgresql-14.8.0'
                      },
                      resourceType: {
                        type: 'string',
                        description: 'Resource type identifier — always "cluster"',
                        example: 'cluster'
                      },
                      status: {
                        type: 'string',
                        enum: ['Running', 'Stopped', 'Creating', 'Updating', 'Failed', 'Deleting'],
                        description: 'Current cluster status',
                        example: 'Running'
                      },
                      quota: {
                        type: 'object',
                        description: 'Resource allocation for each database replica',
                        properties: {
                          cpu: {
                            type: 'number',
                            description: 'CPU cores per replica',
                            example: 1
                          },
                          memory: {
                            type: 'number',
                            description: 'Memory in GB per replica',
                            example: 2
                          },
                          storage: {
                            type: 'number',
                            description: 'Storage in GB per replica',
                            example: 5
                          },
                          replicas: {
                            type: 'integer',
                            description: 'Number of database replicas',
                            example: 1
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'clusters.apps.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot get resource "clusters" in API group "apps.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
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
                      'A Kubernetes API call failed.',
                      'etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/databases/{databaseName}': {
      patch: {
        summary: 'Update database resources',
        description:
          "Updates a database's resource allocation (CPU, memory, storage, replicas). Only provide fields you want to change — all fields are optional.\n\n" +
          'Key points:\n' +
          '- CPU: one of `1, 2, 3, 4, 5, 6, 7, 8` cores\n' +
          '- Memory: one of `1, 2, 4, 6, 8, 12, 16, 32` GB\n' +
          '- Storage: `1–300` GB (can only be expanded, not shrunk)\n' +
          '- Replicas: `1–20`',
        operationId: 'updateDatabase',
        tags: ['Mutation'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database to operate on (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          }
        ],
        requestBody: {
          required: true,
          description:
            'Resource updates to apply. All fields inside `quota` are optional — only provide fields you want to change.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['quota'],
                properties: {
                  quota: {
                    $ref: '#/components/schemas/UpdateResourceSchema'
                  }
                }
              }
            }
          }
        },
        responses: {
          '204': {
            description: 'Database update initiated successfully.'
          },
          '400': {
            description: 'Bad request — invalid resource values',
            content: {
              'application/json': {
                schema: createError400Schema([
                  ErrorCode.INVALID_PARAMETER,
                  ErrorCode.INVALID_VALUE
                ]),
                examples: {
                  invalidParameter: {
                    summary: 'Missing quota field',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Request body validation failed.',
                      [{ field: 'quota', message: 'Required' }]
                    )
                  },
                  invalidValue: {
                    summary: 'Invalid CPU value',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_VALUE,
                      'Invalid CPU value. Must be one of: 1, 2, 3, 4, 5, 6, 7, 8 cores.'
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'opsrequests.apps.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot create resource "opsrequests" in API group "apps.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — database does not exist',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Database not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      "Database 'my-postgres-db' not found.",
                      'clusters.apps.kubeblocks.io "my-postgres-db" not found'
                    )
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict — database is currently being updated',
            content: {
              'application/json': {
                schema: createError409Schema([ErrorCode.ALREADY_EXISTS, ErrorCode.CONFLICT]),
                examples: {
                  conflict: {
                    summary: 'Update in progress',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.CONFLICT,
                      'A conflicting operation is already in progress.',
                      'opsrequests.apps.kubeblocks.io "my-postgres-db-verticalscaling" already exists'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      },
      get: {
        summary: 'Get database details',
        description:
          'Returns detailed information about a specific database including its current status, resource allocation, and configuration.',
        operationId: 'getDatabase',
        tags: ['Query'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database to operate on (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          }
        ],
        responses: {
          '400': {
            description: 'Bad request — invalid path parameters',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Invalid database name',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request parameters.',
                      [{ field: 'databaseName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '200': {
            description: 'Database details retrieved successfully',
            content: {
              'application/json': {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                schema: getDatabaseResponseJsonSchema as any
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'clusters.apps.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot get resource "clusters" in API group "apps.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — database does not exist',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Database not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      "Database 'my-postgres-db' not found.",
                      'clusters.apps.kubeblocks.io "my-postgres-db" not found'
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
                      'A Kubernetes API call failed.',
                      'etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        summary: 'Delete database',
        description:
          'Deletes a database cluster. **Irreversible** — depending on `terminationPolicy`, persistent volumes may also be removed. This operation is idempotent: if the database does not exist, `204` is returned.',
        operationId: 'deleteDatabase',
        tags: ['Mutation'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database to operate on (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          }
        ],
        responses: {
          '204': {
            description: 'Database deleted (or did not exist).'
          },
          '400': {
            description: 'Bad request — invalid path parameters',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Invalid database name',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request parameters.',
                      [{ field: 'databaseName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'clusters.apps.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot delete resource "clusters" in API group "apps.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/databases/{databaseName}/start': {
      post: {
        summary: 'Start database',
        description:
          'Resumes a paused or stopped database. This operation is idempotent: if the database is already running, `204` is returned.',
        operationId: 'startDatabase',
        tags: ['Mutation'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database to operate on (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          }
        ],
        responses: {
          '204': {
            description: 'Database start initiated (or was already running).'
          },
          '400': {
            description: 'Bad request — invalid path parameters',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Missing database name',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request parameters.',
                      [{ field: 'databaseName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'opsrequests.apps.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot create resource "opsrequests" in API group "apps.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — database does not exist',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Database not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      "Database 'my-postgres-db' not found.",
                      'clusters.apps.kubeblocks.io "my-postgres-db" not found'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/databases/{databaseName}/pause': {
      post: {
        summary: 'Pause database',
        description:
          'Gracefully stops a running database while preserving all data and configuration. The database can be resumed with the `start` operation.',
        operationId: 'pauseDatabase',
        tags: ['Mutation'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database to operate on (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          }
        ],
        responses: {
          '204': {
            description: 'Database pause initiated successfully.'
          },
          '400': {
            description: 'Bad request — invalid path parameters',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Missing database name',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request parameters.',
                      [{ field: 'databaseName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'opsrequests.apps.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot create resource "opsrequests" in API group "apps.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — database does not exist',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Database not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      "Database 'my-postgres-db' not found.",
                      'clusters.apps.kubeblocks.io "my-postgres-db" not found'
                    )
                  }
                }
              }
            }
          },
          '409': {
            description:
              'Conflict — database is already paused or a pause operation is in progress',
            content: {
              'application/json': {
                schema: createError409Schema([ErrorCode.ALREADY_EXISTS, ErrorCode.CONFLICT]),
                examples: {
                  conflict: {
                    summary: 'Already paused',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.CONFLICT,
                      'A conflicting operation is already in progress.',
                      'opsrequests.apps.kubeblocks.io "my-postgres-db-stop" already exists'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/databases/{databaseName}/restart': {
      post: {
        summary: 'Restart database',
        description:
          'Performs a rolling restart of all database replicas. This operation is idempotent: if a restart is already in progress, `204` is returned.',
        operationId: 'restartDatabase',
        tags: ['Mutation'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database to operate on (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          }
        ],
        responses: {
          '204': {
            description: 'Database restart initiated (or was already restarting).'
          },
          '400': {
            description: 'Bad request — invalid path parameters',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Missing database name',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request parameters.',
                      [{ field: 'databaseName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'opsrequests.apps.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot create resource "opsrequests" in API group "apps.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — database does not exist',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Database not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      "Database 'my-postgres-db' not found.",
                      'clusters.apps.kubeblocks.io "my-postgres-db" not found'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/databases/{databaseName}/backups': {
      get: {
        summary: 'List database backups',
        description:
          'Returns all manual and automatic backups associated with the specified database, including status and creation timestamp.',
        operationId: 'listDatabaseBackups',
        tags: ['Query'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database to operate on (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          }
        ],
        responses: {
          '400': {
            description: 'Bad request — invalid path parameters',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Invalid database name',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request parameters.',
                      [{ field: 'databaseName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '200': {
            description: 'Backups retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Backup resource name',
                        example: 'my-postgres-db-backup-20240115'
                      },
                      description: {
                        type: 'string',
                        description:
                          'Optional description decoded from backup annotations. Empty string if none was provided.',
                        example: 'weekly backup before schema migration'
                      },
                      createdAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Creation timestamp of the backup resource',
                        example: '2024-01-15T02:00:00Z'
                      },
                      status: {
                        type: 'string',
                        enum: [
                          'completed',
                          'inprogress',
                          'failed',
                          'unknown',
                          'running',
                          'deleting'
                        ],
                        description: 'Current backup status as reported by Kubeblocks (lowercase)',
                        example: 'completed'
                      }
                    },
                    required: ['name', 'description', 'createdAt', 'status']
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'backups.dataprotection.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot list resource "backups" in API group "dataprotection.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
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
                      'A Kubernetes API call failed.',
                      'etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create database backup',
        description:
          'Initiates a manual backup of the database. The backup is created asynchronously.',
        operationId: 'createDatabaseBackup',
        tags: ['Mutation'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database to operate on (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          }
        ],
        requestBody: {
          required: false,
          description:
            'Optional backup configuration including description annotation and explicit backup name',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  description: {
                    type: 'string',
                    maxLength: 31,
                    description:
                      'Optional description for the backup. Stored as label on the Backup resource (max 31 characters due to Kubernetes label value limit of 63 characters when hex-encoded)'
                  },
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 63,
                    pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
                    description:
                      'Optional custom backup name. If omitted, a name will be auto-generated using the database name prefix'
                  }
                },
                example: {
                  description: 'description backup',
                  name: 'my-db-backup-20231113'
                }
              }
            }
          }
        },
        responses: {
          '204': {
            description: 'Backup creation initiated successfully.'
          },
          '400': {
            description:
              'Bad request — invalid body, description too long, or unsupported database type',
            content: {
              'application/json': {
                schema: createError400Schema([
                  ErrorCode.INVALID_PARAMETER,
                  ErrorCode.INVALID_VALUE
                ]),
                examples: {
                  invalidParameter: {
                    summary: 'Body validation failure',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request body.',
                      [{ field: 'name', message: 'String must contain at least 1 character(s)' }]
                    )
                  },
                  descriptionTooLong: {
                    summary: 'Description exceeds limit',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_VALUE,
                      'Backup description is too long. Maximum 31 characters allowed.'
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'backups.dataprotection.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot create resource "backups" in API group "dataprotection.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — database does not exist',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Database not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      "Database 'my-postgres-db' not found.",
                      'clusters.apps.kubeblocks.io "my-postgres-db" not found'
                    )
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict — a backup is currently in progress',
            content: {
              'application/json': {
                schema: createError409Schema([ErrorCode.ALREADY_EXISTS, ErrorCode.CONFLICT]),
                examples: {
                  alreadyExists: {
                    summary: 'Backup already in progress',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.ALREADY_EXISTS,
                      'Resource already exists.',
                      'backups.dataprotection.kubeblocks.io "my-postgres-db-backup" already exists'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/databases/{databaseName}/backups/{backupName}': {
      delete: {
        summary: 'Delete database backup',
        description:
          'Deletes a backup. **Irreversible.** This operation is idempotent: if the backup does not exist, `204` is returned.',
        operationId: 'deleteDatabaseBackup',
        tags: ['Mutation'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database that owns the backup (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          },
          {
            name: 'backupName',
            in: 'path',
            required: true,
            description:
              'Name of the backup to delete (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db-backup-20240115'
            }
          }
        ],
        responses: {
          '204': {
            description: 'Backup deleted (or did not exist).'
          },
          '400': {
            description: 'Bad request — missing or invalid parameters',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Missing backup name',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Database name and backup name are required.',
                      [{ field: 'backupName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'backups.dataprotection.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot delete resource "backups" in API group "dataprotection.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
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
                schema: createError500Schema([
                  ErrorCode.KUBERNETES_ERROR,
                  ErrorCode.INTERNAL_ERROR
                ]),
                examples: {
                  kubernetesError: {
                    summary: 'Kubernetes API error',
                    value: createErrorExample(
                      ErrorType.OPERATION_ERROR,
                      ErrorCode.KUBERNETES_ERROR,
                      'A Kubernetes API call failed.',
                      'backups.dataprotection.kubeblocks.io "my-postgres-db-backup-20240115": Internal error occurred'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/databases/{databaseName}/backups/{backupName}/restore': {
      post: {
        summary: 'Restore database from backup',
        description:
          'Creates a new database cluster restored from the specified backup. Useful for point-in-time recovery or cloning a database for testing.\n\n' +
          'Key points:\n' +
          '- All body fields are optional — if `name` is omitted a name is auto-generated, if `replicas` is omitted the source cluster replica count is used.\n' +
          '- The restored database is a completely new cluster — it does not modify or delete the backup.',
        operationId: 'restoreDatabase',
        tags: ['Mutation'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description: 'Name of the source database (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          },
          {
            name: 'backupName',
            in: 'path',
            required: true,
            description:
              'Name of the backup to restore from (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db-backup-20240115'
            }
          }
        ],
        requestBody: {
          required: false,
          description: 'Optional configuration for the restored database instance',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 63,
                    pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
                    description:
                      'Name for the new restored database instance. Must be a valid Kubernetes resource name. If omitted, a name is auto-generated using the source database name as a prefix.',
                    example: 'my-postgres-db-restored'
                  },
                  replicas: {
                    type: 'integer',
                    minimum: 1,
                    description:
                      'Number of replicas for the restored cluster. If omitted, inherits the source cluster replica count.',
                    example: 1
                  }
                }
              }
            }
          }
        },
        responses: {
          '204': {
            description: 'Database restore initiated successfully.'
          },
          '400': {
            description: 'Bad request — missing path parameters or invalid request body',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  missingPathParam: {
                    summary: 'Missing path parameter',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Database name and backup name are required.'
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'clusters.apps.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot get resource "clusters" in API group "apps.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — backup or source database not found',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Backup not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      'Backup not found.'
                    )
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict — a database with the target name already exists',
            content: {
              'application/json': {
                schema: createError409Schema([ErrorCode.ALREADY_EXISTS, ErrorCode.CONFLICT]),
                examples: {
                  alreadyExists: {
                    summary: 'Database already exists',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.ALREADY_EXISTS,
                      'Database with this name already exists.'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/databases/{databaseName}/enable-public': {
      post: {
        summary: 'Enable public access',
        description:
          'Exposes the database externally via a NodePort or LoadBalancer service. After this succeeds, external connection details are available via `GET /databases/{databaseName}`.',
        operationId: 'enablePublicAccess',
        tags: ['Mutation'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database to operate on (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          }
        ],
        responses: {
          '204': {
            description: 'Public access enabled successfully.'
          },
          '400': {
            description: 'Bad request — invalid database name',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Invalid database name',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request parameters.',
                      [{ field: 'databaseName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'services is forbidden: User "system:serviceaccount:ns-abc" cannot create resource "services" in API group ""'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — database does not exist',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Database not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      'Database not found.'
                    )
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict — public access is already enabled',
            content: {
              'application/json': {
                schema: createError409Schema([ErrorCode.ALREADY_EXISTS, ErrorCode.CONFLICT]),
                examples: {
                  alreadyExists: {
                    summary: 'Already enabled',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.ALREADY_EXISTS,
                      'Resource already exists.',
                      'services "my-postgres-db-export" already exists'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/databases/{databaseName}/disable-public': {
      post: {
        summary: 'Disable public access',
        description:
          'Removes the external NodePort or LoadBalancer service, restricting database access to within the cluster.',
        operationId: 'disablePublicAccess',
        tags: ['Mutation'],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description:
              'Name of the database to operate on (format: lowercase alphanumeric and hyphens)',
            schema: {
              type: 'string',
              minLength: 1,
              example: 'my-postgres-db'
            }
          }
        ],
        responses: {
          '204': {
            description: 'Public access disabled successfully.'
          },
          '400': {
            description: 'Bad request — invalid path parameters',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Invalid database name',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request parameters.',
                      [{ field: 'databaseName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'services is forbidden: User "system:serviceaccount:ns-abc" cannot delete resource "services" in API group ""'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — database or public service not found',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Database not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      "Database 'my-postgres-db' not found.",
                      'clusters.apps.kubeblocks.io "my-postgres-db" not found'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/databases/versions': {
      get: {
        summary: 'List available database versions',
        description:
          'Returns all supported database versions per engine type. Use these version strings when creating a new database.',
        operationId: 'listDatabaseVersions',
        tags: ['Query'],
        responses: {
          '200': {
            description: 'Database versions retrieved successfully',
            content: {
              'application/json': {
                schema: databaseVersionListSchemas.response
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'clusterversions.apps.kubeblocks.io is forbidden: User "system:serviceaccount:ns-abc" cannot list resource "clusterversions" in API group "apps.kubeblocks.io"'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
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
                      'A Kubernetes API call failed.',
                      'etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/logs': {
      get: {
        summary: 'Get database log entries',
        description:
          'Returns paginated log entries from a specific database pod. Use `/logs/files` first to discover available log file paths.',
        operationId: 'getDatabaseLogsData',
        tags: ['Query'],
        parameters: [
          {
            name: 'podName',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              example: 'my-postgres-db-postgresql-0'
            },
            description: 'Name of the pod to retrieve logs from'
          },
          {
            name: 'dbType',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              enum: ['mysql', 'mongodb', 'redis', 'postgresql'],
              example: 'postgresql'
            },
            description: 'Database engine type (determines log format and parsing)'
          },
          {
            name: 'logType',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              enum: ['runtimeLog', 'slowQuery', 'errorLog'],
              example: 'errorLog'
            },
            description:
              'Type of log to retrieve. Allowed values: "runtimeLog", "slowQuery", "errorLog"'
          },
          {
            name: 'logPath',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              example: '/var/lib/postgresql/data/log/postgresql.log'
            },
            description: 'Absolute path to the log file within the pod'
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1,
              example: 1
            },
            description: 'Page number for pagination (starts at 1)'
          },
          {
            name: 'pageSize',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 1000,
              default: 100,
              example: 100
            },
            description: 'Number of log entries per page (max 1000)'
          }
        ],
        responses: {
          '200': {
            description: 'Log entries retrieved successfully',
            content: {
              'application/json': {
                schema: logsDataSchemas.response
              }
            }
          },
          '400': {
            description: 'Bad request — invalid query parameters',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Missing required parameter',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request parameters.',
                      [{ field: 'podName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'pods/exec is forbidden: User "system:serviceaccount:ns-abc" cannot create resource "pods/exec" in API group ""'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — pod or log file not found',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Pod not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      'Pod "my-postgres-db-postgresql-0" not found.',
                      'pods "my-postgres-db-postgresql-0" not found'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
                      'connect ECONNREFUSED 10.0.0.1:6443'
                    )
                  }
                }
              }
            }
          }
        }
      }
    },
    '/logs/files': {
      get: {
        summary: 'List database log files',
        description:
          'Returns metadata about available log files for a specific database pod. Use the returned paths with `GET /logs` to fetch log entries.',
        operationId: 'listDatabaseLogFiles',
        tags: ['Query'],
        parameters: [
          {
            name: 'podName',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              example: 'my-postgres-db-postgresql-0'
            },
            description: 'Name of the pod to list log files from'
          },
          {
            name: 'dbType',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              enum: ['mysql', 'mongodb', 'redis', 'postgresql'],
              example: 'postgresql'
            },
            description: 'Database engine type (determines where to look for log files)'
          },
          {
            name: 'logType',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              enum: ['runtimeLog', 'slowQuery', 'errorLog'],
              example: 'errorLog'
            },
            description:
              'Type of logs to list. Allowed values: "runtimeLog", "slowQuery", "errorLog"'
          }
        ],
        responses: {
          '200': {
            description: 'Log files retrieved successfully',
            content: {
              'application/json': {
                schema: logsFileSchemas.response
              }
            }
          },
          '400': {
            description: 'Bad request — invalid query parameters',
            content: {
              'application/json': {
                schema: createError400Schema([ErrorCode.INVALID_PARAMETER]),
                examples: {
                  invalidParameter: {
                    summary: 'Missing required parameter',
                    value: createErrorExample(
                      ErrorType.VALIDATION_ERROR,
                      ErrorCode.INVALID_PARAMETER,
                      'Invalid request parameters.',
                      [{ field: 'podName', message: 'Required' }]
                    )
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — invalid or missing kubeconfig',
            content: {
              'application/json': {
                schema: createError401Schema(),
                examples: {
                  missingAuth: {
                    summary: 'Missing authentication',
                    value: createErrorExample(
                      ErrorType.AUTHENTICATION_ERROR,
                      ErrorCode.AUTHENTICATION_REQUIRED,
                      'Unauthorized, please login again.'
                    )
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden — insufficient permissions',
            content: {
              'application/json': {
                schema: createError403Schema([
                  ErrorCode.PERMISSION_DENIED,
                  ErrorCode.INSUFFICIENT_BALANCE
                ]),
                examples: {
                  permissionDenied: {
                    summary: 'Insufficient permissions',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.PERMISSION_DENIED,
                      'Insufficient permissions to perform this operation.',
                      'pods/exec is forbidden: User "system:serviceaccount:ns-abc" cannot create resource "pods/exec" in API group ""'
                    )
                  },
                  insufficientBalance: {
                    summary: 'Insufficient account balance',
                    value: createErrorExample(
                      ErrorType.AUTHORIZATION_ERROR,
                      ErrorCode.INSUFFICIENT_BALANCE,
                      'Insufficient balance to perform this operation.',
                      'admission webhook "account.sealos.io" denied the request: account balance less than 0'
                    )
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found — pod not found or no log files available',
            content: {
              'application/json': {
                schema: createError404Schema(),
                examples: {
                  notFound: {
                    summary: 'Pod not found',
                    value: createErrorExample(
                      ErrorType.RESOURCE_ERROR,
                      ErrorCode.NOT_FOUND,
                      'Pod "my-postgres-db-postgresql-0" not found.',
                      'pods "my-postgres-db-postgresql-0" not found'
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
                      'A Kubernetes API call failed.',
                      'clusters.apps.kubeblocks.io "my-postgres-db": Internal error occurred: etcdserver: request timed out'
                    )
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable — Kubernetes cluster unreachable',
            content: {
              'application/json': {
                schema: createError503Schema(),
                examples: {
                  clusterUnavailable: {
                    summary: 'Cluster unreachable',
                    value: createErrorExample(
                      ErrorType.INTERNAL_ERROR,
                      ErrorCode.SERVICE_UNAVAILABLE,
                      'The Kubernetes cluster is temporarily unreachable.',
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
