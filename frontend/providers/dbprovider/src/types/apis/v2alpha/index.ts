import { createDocument } from 'zod-openapi';
import { z } from 'zod';
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

import * as enablePublicAccessSchemas from './network/enable-public-access';
export * as enablePublicAccessSchemas from './network/enable-public-access';

import * as disablePublicAccessSchemas from './network/disable-public-access';

const getDatabaseResponseDocSchema = dbEditSchema.extend({
  uid: z.string().describe('Unique identifier of the database resource'),
  status: dbStatusSchema.describe('Current status of the database cluster'),
  createdAt: z.string().describe('Creation timestamp of the database cluster')
});
export * as disablePublicAccessSchemas from './network/disable-public-access';

export const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Database API',
    version: '1.0.0',
    description:
      'RESTful API for managing database instances with KubeBlocks on Kubernetes. This API follows REST best practices:\n\n' +
      '**Query Operations (GET):**\n' +
      '- Return `200 OK` on success with data in response body\n' +
      '- Return appropriate error status codes (400, 401, 403, 404, 500, 503) with error details\n\n' +
      '**Mutation Operations (POST, PATCH, DELETE):**\n' +
      '- Return `204 No Content` on success without response body\n' +
      '- Return appropriate error status codes (400, 401, 403, 404, 409, 500, 503) with error details\n\n' +
      '**Features:**\n' +
      '- Database lifecycle management (create, update, delete, start, pause, restart)\n' +
      '- Resource scaling (CPU, memory, storage, replicas)\n' +
      '- Backup and restore operations\n' +
      '- Network access control (public/private)\n' +
      '- Log retrieval and monitoring'
  },
  servers: [
    {
      url: `http://127.0.0.1:3000/api/v2alpha`,
      description: 'Development'
    },
    {
      url: `https://dbprovider./api/v2alpha`,
      description: 'Production'
    }
  ],
  components: {
    securitySchemes: {
      KubeconfigAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization'
      }
    },
    schemas: {
      UpdateResourceSchema: {
        type: 'object',
        properties: {
          cpu: {
            type: 'number',
            enum: [0.5, 1, 2, 3, 4, 5, 6, 7, 8],
            description: 'CPU cores (minimum 1 core, will be converted to millicores in K8s)'
          },
          memory: {
            type: 'number',
            enum: [0.5, 1, 2, 4, 6, 8, 12, 16, 32],
            description: 'Memory in GB (minimum 1 GB, will be converted to Gi in K8s)'
          },
          storage: {
            type: 'number',
            enum: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21],
            description: 'Storage in GB (will be converted to Gi in K8s)'
          },
          replicas: {
            type: 'integer',
            minimum: 3,
            maximum: 300,
            description: 'Number of replicas'
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
  paths: {
    '/database': {
      post: {
        summary: 'Create Database',
        description:
          'Creates a new database instance with KubeBlocks. This mutation operation provisions database resources, configures settings, and optionally sets up automatic backups. CPU values are converted to millicores (e.g., 2 cores -> 2000m), memory to Gi (e.g., 2GB -> 2Gi), and storage to Gi.',
        operationId: 'createDatabase',
        tags: ['Mutation'],
        security: [
          {
            KubeconfigAuth: []
          }
        ],
        requestBody: {
          required: true,
          description:
            'Database configuration including type, version, resources, and optional backup/parameter settings',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type', 'resource'],
                properties: {
                  terminationPolicy: {
                    type: 'string',
                    enum: ['Delete', 'WipeOut'],
                    default: 'Delete',
                    description:
                      'Cluster termination policy. "Delete" removes the cluster but keeps PVCs, "WipeOut" removes everything including data. Defaults to "Delete" if not provided.'
                  },
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 63,
                    pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
                    description:
                      'Database name. Must be a valid Kubernetes resource name (lowercase alphanumeric and hyphens)'
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
                    description: 'Database type/engine to deploy'
                  },
                  version: {
                    type: 'string',
                    description:
                      'Database version (e.g., "14.8.0" for PostgreSQL). Must match available versions from /database/version/list endpoint. If not provided, the latest version for the specified database type will be automatically selected.'
                  },
                  resource: {
                    type: 'object',
                    required: ['cpu', 'memory', 'storage', 'replicas'],
                    properties: {
                      cpu: {
                        type: 'number',
                        enum: [1, 2, 3, 4, 5, 6, 7, 8],
                        description:
                          'CPU cores allocated to each database instance (minimum 1 core, automatically converted to millicores in Kubernetes)',
                        default: 1
                      },
                      memory: {
                        type: 'number',
                        enum: [1, 2, 4, 6, 8, 12, 16, 32],
                        description:
                          'Memory in GB allocated to each database instance (minimum 1 GB, automatically converted to Gi in Kubernetes)',
                        default: 1
                      },
                      storage: {
                        type: 'number',
                        enum: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21],
                        description:
                          'Persistent storage in GB for each database instance (automatically converted to Gi in Kubernetes)',
                        default: 3
                      },
                      replicas: {
                        type: 'integer',
                        minimum: 3,
                        maximum: 300,
                        description: 'Number of database replicas for high availability',
                        default: 3
                      }
                    }
                  },
                  autoBackup: {
                    type: 'object',
                    properties: {
                      start: {
                        type: 'boolean',
                        description: 'Enable automatic backups'
                      },
                      type: {
                        type: 'string',
                        enum: ['day', 'week'],
                        description: 'Backup frequency type'
                      },
                      week: {
                        type: 'array',
                        items: {
                          type: 'string',
                          enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                        },
                        description: 'Days of the week to run backups (for weekly backups)'
                      },
                      hour: {
                        type: 'string',
                        pattern: '^([01]?[0-9]|2[0-3])$',
                        description: 'Hour to run backup (24-hour format, 00-23)'
                      },
                      minute: {
                        type: 'string',
                        pattern: '^[0-5]?[0-9]$',
                        description: 'Minute to run backup (00-59)'
                      },
                      saveTime: {
                        type: 'number',
                        minimum: 1,
                        description: 'Backup retention duration'
                      },
                      saveType: {
                        type: 'string',
                        enum: ['days', 'weeks', 'months'],
                        description: 'Backup retention unit'
                      }
                    },
                    description:
                      'Automatic backup configuration (optional). If not provided, no automatic backups will be configured'
                  },
                  parameterConfig: {
                    type: 'object',
                    properties: {
                      maxConnections: {
                        type: 'string',
                        description: 'Maximum number of database connections'
                      },
                      timeZone: {
                        type: 'string',
                        description: 'Database timezone (e.g., "Asia/Shanghai", "UTC")'
                      },
                      lowerCaseTableNames: {
                        type: 'string',
                        enum: ['0', '1'],
                        description:
                          'MySQL-specific: whether table names are case-sensitive. 0=case-sensitive, 1=case-insensitive'
                      }
                    },
                    description:
                      'Database-specific parameter configuration (optional). Available parameters vary by database type'
                  }
                },
                example: {
                  name: 'my-postgres-db',
                  type: 'postgresql',
                  version: 'postgresql-14.8.0',
                  resource: {
                    cpu: 2,
                    memory: 2,
                    storage: 5,
                    replicas: 3
                  },
                  autoBackup: {
                    start: true,
                    type: 'day',
                    week: [],
                    hour: '02',
                    minute: '00',
                    saveTime: 7,
                    saveType: 'days'
                  },
                  parameterConfig: {
                    maxConnections: '100',
                    timeZone: 'Asia/Shanghai',
                    lowerCaseTableNames: '0'
                  }
                }
              }
            }
          }
        },
        responses: {
          '204': {
            description:
              'No Content - Database creation initiated successfully. The database is being provisioned and will be available shortly.'
          },
          '400': {
            description:
              'Bad Request - Invalid request body, resource values, or parameter configuration',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'number',
                      example: 400
                    },
                    message: {
                      type: 'string',
                      example: 'Invalid request body'
                    },
                    error: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field: {
                            type: 'string',
                            example: 'resource.cpu'
                          },
                          message: {
                            type: 'string',
                            example: 'CPU must be one of: 1, 2, 3, 4, 5, 6, 7, 8 cores'
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
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description:
              'Forbidden - Insufficient permissions to create databases in this namespace',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict - Database with this name already exists',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 409 },
                    message: { type: 'string', example: 'Database already exists' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to create database due to server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description:
              'Service Unavailable - Kubernetes cluster is unavailable or not responding',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      },
      get: {
        summary: 'List All Databases',
        description:
          'Retrieves a list of all database instances in the current namespace. Returns detailed information about each database including status, resources, and configuration.',
        operationId: 'listDatabases',
        tags: ['Query'],
        security: [{ KubeconfigAuth: [] }],
        responses: {
          '200': {
            description: 'OK - Successfully retrieved list of databases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['code', 'data'],
                  properties: {
                    code: {
                      type: 'number',
                      example: 200
                    },
                    data: {
                      type: 'array',
                      description:
                        'Array of database instances with their current status and configuration',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', description: 'Database name' },
                          type: { type: 'string', description: 'Database type' },
                          version: { type: 'string', description: 'Database version' },
                          status: {
                            type: 'string',
                            enum: ['Running', 'Stopped', 'Creating', 'Updating', 'Failed'],
                            description: 'Current database status'
                          },
                          resource: {
                            type: 'object',
                            properties: {
                              cpu: { type: 'number' },
                              memory: { type: 'number' },
                              storage: { type: 'number' },
                              replicas: { type: 'number' }
                            }
                          },
                          createTime: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp'
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
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to list databases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to retrieve databases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}': {
      patch: {
        summary: 'Update Database Resources',
        description:
          "Updates a database's resource allocation (CPU, Memory, Storage, Replicas). This mutation triggers Kubernetes OpsRequests for vertical scaling (CPU/Memory), horizontal scaling (Replicas), or volume expansion (Storage). Resources are automatically converted to proper Kubernetes units (cores to millicores, GB to Gi).",
        operationId: 'updateDatabaseResources',
        tags: ['Mutation'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the database to update'
          }
        ],
        requestBody: {
          required: true,
          description:
            'Resource updates to apply. All fields are optional - only provide fields you want to update',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  resource: {
                    $ref: '#/components/schemas/UpdateResourceSchema'
                  }
                },
                required: ['resource'],
                example: {
                  resource: {
                    cpu: 4,
                    memory: 8,
                    storage: 10,
                    replicas: 5
                  }
                }
              }
            }
          }
        },
        responses: {
          '204': {
            description:
              'No Content - Database update initiated successfully. The database is being scaled and will reflect the new resources shortly.'
          },
          '400': {
            description: 'Bad Request - Invalid resource values or configuration',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Invalid resource values' },
                    error: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field: { type: 'string', example: 'resource.storage' },
                          message: { type: 'string', example: 'Cannot decrease storage size' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to update databases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Database does not exist',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Database not found' }
                  }
                }
              }
            }
          },
          '409': {
            description:
              'Conflict - Database is currently being updated or in an incompatible state',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 409 },
                    message: { type: 'string', example: 'Database update already in progress' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to update database',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      },
      get: {
        summary: 'Get Database Details',
        description:
          'Retrieves detailed information about a specific database including its current status, resource allocation, configuration, connection information, and operational metrics.',
        operationId: 'getDatabaseDetails',
        tags: ['Query'],
        security: [
          {
            KubeconfigAuth: []
          }
        ],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the database to retrieve'
          }
        ],
        responses: {
          '200': {
            description: 'OK - Successfully retrieved database details',
            content: {
              'application/json': {
                schema: getDatabaseResponseDocSchema
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to view database details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Database does not exist',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Database not found' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to retrieve database details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        summary: 'Delete Database',
        description:
          'Permanently deletes a database instance. This mutation removes the database cluster and, depending on the termination policy, may also delete persistent volumes and data. This operation cannot be undone.',
        operationId: 'deleteDatabase',
        tags: ['Mutation'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the database to delete'
          }
        ],
        responses: {
          '204': {
            description:
              'No Content - Database deletion initiated successfully. The database and associated resources are being removed.'
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to delete databases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Database does not exist',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Database not found' }
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict - Database cannot be deleted in its current state',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 409 },
                    message: { type: 'string', example: 'Database is currently being updated' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to delete database',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/start': {
      post: {
        summary: 'Start Database',
        description:
          'Starts a paused or stopped database instance. This mutation creates an OpsRequest to resume the database cluster and bring all replicas back online.',
        operationId: 'startDatabase',
        tags: ['Mutation'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the database to start'
          }
        ],
        responses: {
          '204': {
            description:
              'No Content - Database start operation initiated successfully. The database is starting and will be ready shortly.'
          },
          '400': {
            description: 'Bad Request - Database is already running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Database is already running' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to start databases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Database does not exist',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Database not found' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to start database',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/pause': {
      post: {
        summary: 'Pause Database',
        description:
          'Pauses a running database instance. This mutation creates an OpsRequest to gracefully stop the database cluster while preserving all data and configuration. The database can be resumed later using the start operation.',
        operationId: 'pauseDatabase',
        tags: ['Mutation'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the database to pause'
          }
        ],
        responses: {
          '204': {
            description:
              'No Content - Database pause operation initiated successfully. The database is shutting down gracefully.'
          },
          '400': {
            description: 'Bad Request - Database is already paused or in an incompatible state',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Database is already paused' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to pause databases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Database does not exist',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Database not found' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to pause database',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/restart': {
      post: {
        summary: 'Restart Database',
        description:
          'Restarts a running database instance. This mutation creates an OpsRequest to perform a rolling restart of all database replicas, applying any pending configuration changes without data loss.',
        operationId: 'restartDatabase',
        tags: ['Mutation'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the database to restart'
          }
        ],
        responses: {
          '204': {
            description:
              'No Content - Database restart operation initiated successfully. The database is performing a rolling restart.'
          },
          '400': {
            description: 'Bad Request - Database cannot be restarted in its current state',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Database must be running to restart' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to restart databases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Database does not exist',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Database not found' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to restart database',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/backup': {
      get: {
        summary: 'List Database Backups',
        description:
          'Retrieves all manual and automatic backups associated with the specified database. Returns basic metadata for each backup, including its decoded description, creation timestamp, and current status reported by Kubeblocks.',
        operationId: 'listDatabaseBackups',
        tags: ['Query'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the database whose backups will be listed'
          }
        ],
        responses: {
          '200': {
            description: 'OK - Successfully retrieved backups for the database',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Backup resource name'
                      },
                      description: {
                        type: 'string',
                        description:
                          'Optional description decoded from backup annotations. Empty string if none was provided.'
                      },
                      createdAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Creation timestamp of the backup resource'
                      },
                      status: {
                        type: 'string',
                        enum: [
                          'completed',
                          'inprogress',
                          'failed',
                          'unknow',
                          'running',
                          'deleting'
                        ],
                        description: 'Current backup status as reported by Kubeblocks (lowercase)'
                      }
                    },
                    required: ['name', 'description', 'createdAt', 'status']
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to list backups',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to retrieve backups',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create Database Backup',
        description:
          'Creates a manual backup of a database. This mutation initiates a backup operation that captures the current state of the database for disaster recovery or migration purposes. The backup is stored according to the configured backup storage provider.',
        operationId: 'createDatabaseBackup',
        tags: ['Mutation'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the database to backup'
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
            description:
              'No Content - Backup creation initiated successfully. The backup is being created and will be available shortly.'
          },
          '400': {
            description:
              'Bad Request - Invalid request body, description too long, or unsupported database type',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      example:
                        'Description is too long. Maximum length is 31 characters when encoded for Kubernetes labels.'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to create backups',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Database does not exist',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Database not found' }
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict - Another backup is currently in progress',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 409 },
                    message: { type: 'string', example: 'Backup already in progress' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to create backup',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Backup storage provider is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Backup storage unavailable' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/backup/{backupName}': {
      post: {
        summary: 'Restore Database from Backup',
        description:
          'Restores a database from a specific backup by creating a new database instance. This mutation creates a new database cluster with the data from the backup, allowing point-in-time recovery or database cloning for testing/development purposes.',
        operationId: 'restoreDatabaseFromBackup',
        tags: ['Mutation'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the original database (source of the backup)'
          },
          {
            name: 'backupName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the backup to restore from'
          }
        ],
        requestBody: {
          required: true,
          description: 'Configuration for the restored database instance',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 63,
                    pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
                    description:
                      'Name for the new restored database instance. Must be a valid Kubernetes resource name',
                    example: 'my-postgres-db-restored'
                  }
                }
              }
            }
          }
        },
        responses: {
          '204': {
            description:
              'No Content - Database restore initiated successfully. A new database is being created from the backup.'
          },
          '400': {
            description: 'Bad Request - Invalid request body or database name',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Invalid database name format' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to restore backups',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Backup or original database not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Backup not found' }
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict - Database with the provided name already exists',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 409 },
                    message: { type: 'string', example: 'Database with this name already exists' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to restore database',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Backup storage or Kubernetes cluster unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Service unavailable' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        summary: 'Delete Database Backup',
        description:
          'Permanently deletes a database backup. This mutation removes the backup from storage and cannot be undone. The original database and other backups are not affected.',
        operationId: 'deleteDatabaseBackup',
        tags: ['Mutation'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the database that owns the backup'
          },
          {
            name: 'backupName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the backup to delete'
          }
        ],
        responses: {
          '204': {
            description: 'No Content - Backup deleted successfully'
          },
          '400': {
            description: 'Bad Request - Missing or invalid parameters',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Invalid backup name' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to delete backups',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Backup not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Backup not found' }
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict - Backup is currently being used for a restore operation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 409 },
                    message: { type: 'string', example: 'Backup is currently in use' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to delete backup',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Backup storage provider is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Backup storage unavailable' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/enablePublic': {
      post: {
        summary: 'Enable Public Access',
        description:
          'Enables public network access for a database by creating a NodePort or LoadBalancer service. This mutation allows the database to be accessed from outside the Kubernetes cluster network.',
        operationId: 'enablePublicAccess',
        tags: ['Mutation'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description: 'Name of the database',
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '204': {
            description:
              'No Content - Public access enabled successfully. External connection details can be retrieved via the GET /database/{databaseName} endpoint.'
          },
          '400': {
            description: 'Bad Request - Invalid database name',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Invalid parameters' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to modify network access',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Database does not exist',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Database not found' }
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict - Public access is already enabled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 409 },
                    message: { type: 'string', example: 'Public access already enabled' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to enable public access',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/disablePublic': {
      post: {
        summary: 'Disable Public Access',
        description:
          'Disables public network access for a database by removing the NodePort or LoadBalancer service. This mutation restricts database access to within the Kubernetes cluster network only.',
        operationId: 'disablePublicAccess',
        tags: ['Mutation'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            description: 'Name of the database',
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '204': {
            description:
              'No Content - Public access disabled successfully. The database is now only accessible within the cluster.'
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to modify network access',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Database not found or public access not enabled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: {
                      type: 'string',
                      example: 'Public access not enabled for this database'
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to disable public access',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/database/version/list': {
      get: {
        summary: 'List Available Database Versions',
        description:
          'Retrieves a list of all available database versions for each supported database type. This query returns version information that can be used when creating new databases.',
        operationId: 'listDatabaseVersions',
        tags: ['Query'],
        security: [{ KubeconfigAuth: [] }],
        responses: {
          '200': {
            description: 'OK - Successfully retrieved database versions',
            content: {
              'application/json': {
                schema: databaseVersionListSchemas.response
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to list database versions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to retrieve database versions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/logs/data': {
      get: {
        summary: 'Get Database Logs Data',
        description:
          'Retrieves paginated log data from a specific database pod. This query returns log entries from the specified log file path, supporting pagination for large log files.',
        operationId: 'getDatabaseLogsData',
        tags: ['Query'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'podName',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the Kubernetes pod to retrieve logs from'
          },
          {
            name: 'dbType',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              enum: ['mysql', 'mongodb', 'redis', 'postgresql']
            },
            description: 'Database type (determines log format and parsing)'
          },
          {
            name: 'logType',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Type of log to retrieve (e.g., "error", "slow-query", "general")'
          },
          {
            name: 'logPath',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'File path to the log file within the pod'
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1
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
              default: 100
            },
            description: 'Number of log entries per page (max 1000)'
          }
        ],
        responses: {
          '200': {
            description: 'OK - Successfully retrieved log data',
            content: {
              'application/json': {
                schema: logsDataSchemas.response
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid query parameters',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Invalid page or pageSize parameter' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to access logs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Pod or log file not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Pod or log file not found' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to retrieve logs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
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
        summary: 'List Database Log Files',
        description:
          'Retrieves a list of available log files for a specific database pod. This query returns metadata about log files including names, sizes, and paths that can be used with the /logs/data endpoint.',
        operationId: 'listDatabaseLogFiles',
        tags: ['Query'],
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'podName',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the Kubernetes pod to list log files from'
          },
          {
            name: 'dbType',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              enum: ['mysql', 'mongodb', 'redis', 'postgresql']
            },
            description: 'Database type (determines where to look for log files)'
          },
          {
            name: 'logType',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Type of logs to list (e.g., "error", "slow-query", "general")'
          }
        ],
        responses: {
          '200': {
            description: 'OK - Successfully retrieved list of log files',
            content: {
              'application/json': {
                schema: logsFileSchemas.response
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid query parameters',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Invalid dbType or logType parameter' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Invalid or missing authentication credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Insufficient permissions to access logs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden: insufficient permissions' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not Found - Pod not found or no log files available',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Pod not found' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal Server Error - Failed to list log files',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service Unavailable - Kubernetes cluster is unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'number', example: 503 },
                    message: { type: 'string', example: 'Kubernetes cluster unavailable' }
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
