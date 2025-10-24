import { createDocument } from 'zod-openapi';

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
export * as disablePublicAccessSchemas from './network/disable-public-access';

export const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Database API',
    version: '1.0.0',
    description:
      'API for managing databases with KubeBlocks - Fixed resource handling and backup endpoints'
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Local development server'
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
            enum: [1, 2, 3, 4, 5, 6, 7, 8],
            description: 'CPU cores (minimum 1 core, will be converted to millicores in K8s)'
          },
          memory: {
            type: 'number',
            enum: [1, 2, 4, 6, 8, 12, 16, 32],
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
          'Create a new database with proper resource conversion. CPU will be converted to millicores (2 -> 2000m), Memory to Gi (2 -> 2Gi).',
        security: [
          {
            KubeconfigAuth: []
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['terminationPolicy', 'name', 'type', 'version', 'resource'],
                properties: {
                  terminationPolicy: {
                    type: 'string',
                    enum: ['Delete', 'WipeOut'],
                    description: 'Cluster termination policy'
                  },
                  name: {
                    type: 'string',
                    description: 'Database name'
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
                    description: 'Database type'
                  },
                  version: {
                    type: 'string',
                    description: 'Database version'
                  },
                  resource: {
                    type: 'object',
                    required: ['cpu', 'memory', 'storage', 'replicas'],
                    properties: {
                      cpu: {
                        type: 'number',
                        enum: [1, 2, 3, 4, 5, 6, 7, 8],
                        description:
                          'CPU cores (minimum 1 core, automatically converted to millicores)',
                        default: 1
                      },
                      memory: {
                        type: 'number',
                        enum: [1, 2, 4, 6, 8, 12, 16, 32],
                        description: 'Memory in GB (minimum 1 GB, automatically converted to Gi)',
                        default: 1
                      },
                      storage: {
                        type: 'number',
                        enum: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21],
                        description: 'Storage in GB (automatically converted to Gi)',
                        default: 3
                      },
                      replicas: {
                        type: 'integer',
                        minimum: 3,
                        maximum: 300,
                        description: 'Number of replicas',
                        default: 3
                      }
                    }
                  },
                  autoBackup: {
                    type: 'object',
                    properties: {
                      start: {
                        type: 'boolean'
                      },
                      type: {
                        type: 'string'
                      },
                      week: {
                        type: 'array',
                        items: {
                          type: 'string'
                        }
                      },
                      hour: {
                        type: 'string'
                      },
                      minute: {
                        type: 'string'
                      },
                      saveTime: {
                        type: 'number'
                      },
                      saveType: {
                        type: 'string'
                      }
                    },
                    description: 'Auto backup configuration (optional)'
                  },
                  parameterConfig: {
                    type: 'object',
                    properties: {
                      maxConnections: {
                        type: 'string'
                      },
                      timeZone: {
                        type: 'string'
                      },
                      lowerCaseTableNames: {
                        type: 'string'
                      }
                    },
                    description: 'Database parameter configuration (optional)'
                  }
                },
                example: {
                  terminationPolicy: 'Delete',
                  name: 'my-postgres-db',
                  type: 'postgresql',
                  version: '14.8.0',
                  resource: {
                    cpu: 2,
                    memory: 2,
                    storage: 5,
                    replicas: 3
                  },
                  autoBackup: {
                    start: true,
                    type: 'day',
                    week: [''],
                    hour: '02',
                    minute: '00',
                    saveTime: 7,
                    saveType: 'days'
                  },
                  parameterConfig: {
                    maxConnections: '100',
                    timeZone: 'Asia/Shanghai',
                    lowerCaseTableNames: '1'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Database created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'number',
                      example: 200
                    },
                    message: {
                      type: 'string',
                      example: 'success create db'
                    },
                    data: {
                      type: 'object',
                      description: 'Created database details with properly converted resources'
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid resource values',
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
                      example: 'Invalid request body.'
                    },
                    error: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          message: {
                            type: 'string',
                            example:
                              'CPU must be one of: 1, 2, 3, 4, 5, 6, 7, 8 cores (minimum 1 core)'
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
      },
      get: {
        summary: 'List Databases',
        description: 'Get all databases in the namespace.',
        security: [{ KubeconfigAuth: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'number',
                      example: 200
                    },
                    data: {
                      type: 'object',
                      description: 'List of all databases'
                    }
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
          "Update a database's resource limits (CPU, Memory, Storage, Replicas). Resources are automatically converted to proper K8s units.",
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
                    cpu: 2,
                    memory: 4,
                    storage: 5,
                    replicas: 5
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Database update initiated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'integer',
                      example: 200
                    },
                    message: {
                      type: 'string',
                      example: 'Database update initiated successfully'
                    },
                    data: {
                      type: 'object',
                      properties: {
                        dbName: {
                          type: 'string',
                          description: 'Name of the database'
                        },
                        operations: {
                          type: 'object',
                          properties: {
                            verticalScaling: {
                              type: 'boolean',
                              description: 'Whether vertical scaling was performed'
                            },
                            horizontalScaling: {
                              type: 'boolean',
                              description: 'Whether horizontal scaling was performed'
                            },
                            volumeExpansion: {
                              type: 'boolean',
                              description: 'Whether volume expansion was performed'
                            }
                          }
                        },
                        updatedResources: {
                          $ref: '#/components/schemas/UpdateResourceSchema'
                        },
                        clusterData: {
                          $ref: '#/components/schemas/K8sClusterResource'
                        },
                        opsRequests: {
                          type: 'array',
                          items: {
                            $ref: '#/components/schemas/OpsRequest'
                          },
                          description: 'List of created OpsRequest resources'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid resource values'
          },
          '404': {
            description: 'Database not found'
          }
        }
      },
      get: {
        summary: 'Get Database',
        description: 'Get a database by name.',
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
            }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: getDatabaseSchemas.response
              }
            }
          },
          '404': {
            description: 'Database not found'
          }
        }
      },
      delete: {
        summary: 'Delete a Database',
        description: 'Delete a database by name.',
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: deleteDatabaseSchemas.response
              }
            }
          },
          '404': {
            description: 'Database not found'
          }
        }
      }
    },
    '/database/{databaseName}/start': {
      post: {
        summary: 'Start Database',
        description: 'Start a database.',
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: startDatabaseSchemas.response
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/pause': {
      post: {
        summary: 'Pause Database',
        description: 'Pause a database.',
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: pauseDatabaseSchemas.response
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/restart': {
      post: {
        summary: 'Restart Database',
        description: 'Restart a database.',
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: restartDatabaseSchemas.response
              }
            }
          }
        }
      }
    },
    '/database/{databaseName}/backup': {
      post: {
        summary: 'Create Database Backup',
        description: 'Create a manual backup for a specific database.',
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
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  remark: {
                    type: 'string',
                    description: 'Optional remark for the backup'
                  }
                },
                example: {
                  remark: 'Manual backup before major update'
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Backup created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'number',
                      example: 200
                    },
                    message: {
                      type: 'string',
                      example: 'Backup created successfully'
                    },
                    data: {
                      type: 'object',
                      properties: {
                        backupName: {
                          type: 'string',
                          description: 'Generated backup name with random suffix',
                          example: 'my-postgres-db-backup-abcdefgh'
                        },
                        dbName: {
                          type: 'string',
                          description: 'Database name',
                          example: 'my-postgres-db'
                        },
                        dbType: {
                          type: 'string',
                          description: 'Database type',
                          example: 'postgresql'
                        },
                        remark: {
                          type: 'string',
                          description: 'Backup remark',
                          example: 'Manual backup before major update'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid request body or unsupported database type'
          },
          '404': {
            description: 'Database not found'
          },
          '500': {
            description: 'Internal Server Error'
          }
        }
      }
    },
    '/database/{databaseName}/backup/{backupName}': {
      post: {
        summary: 'Restore Database from Backup',
        description:
          'Restore a database from a specific backup by creating a new database instance.',
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
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newDbName'],
                properties: {
                  newDbName: {
                    type: 'string',
                    minLength: 1,
                    description: 'Name for the new restored database instance',
                    example: 'my-postgres-db-restored'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Database restore initiated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'number',
                      example: 200
                    },
                    message: {
                      type: 'string',
                      example: 'Database restore initiated successfully'
                    },
                    data: {
                      type: 'object',
                      properties: {
                        originalDbName: {
                          type: 'string',
                          description: 'Name of the original database',
                          example: 'my-postgres-db'
                        },
                        newDbName: {
                          type: 'string',
                          description:
                            'Auto-generated name of the new restored database (8 random letters)',
                          example: 'abcdefgh'
                        },
                        backupName: {
                          type: 'string',
                          description: 'Name of the backup used for restoration',
                          example: 'my-postgres-db-backup-abcdefgh'
                        },
                        dbType: {
                          type: 'string',
                          description: 'Database type',
                          example: 'postgresql'
                        },
                        dbVersion: {
                          type: 'string',
                          description: 'Database version',
                          example: 'postgresql-14.8.2'
                        },
                        resource: {
                          type: 'object',
                          properties: {
                            cpu: { type: 'number' },
                            memory: { type: 'number' },
                            storage: { type: 'number' },
                            replicas: { type: 'number' }
                          },
                          description: 'Resource configuration of the restored database'
                        },
                        restoredAt: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Restoration initiation timestamp',
                          example: '2024-01-15T10:30:00.000Z'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid request body'
          },
          '404': {
            description: 'Backup or database not found'
          },
          '500': {
            description: 'Internal Server Error'
          }
        }
      },
      delete: {
        summary: 'Delete Database Backup',
        description: 'Delete a specific backup by name.',
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'databaseName',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Name of the database'
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
          '200': {
            description: 'Backup deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'number',
                      example: 200
                    },
                    message: {
                      type: 'string',
                      example: 'Backup deleted successfully'
                    },
                    data: {
                      type: 'object',
                      properties: {
                        backupName: {
                          type: 'string',
                          description: 'Name of the deleted backup',
                          example: 'my-postgres-db-backup-abcdefgh'
                        },
                        dbName: {
                          type: 'string',
                          description: 'Database name',
                          example: 'my-postgres-db'
                        },
                        deletedAt: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Deletion timestamp',
                          example: '2024-01-15T10:30:00.000Z'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad Request - Missing required parameters'
          },
          '404': {
            description: 'Backup not found'
          },
          '500': {
            description: 'Internal Server Error'
          }
        }
      }
    },
    '/database/{databaseName}/enablePublic': {
      post: {
        summary: 'Enable Public Access',
        description: 'Enable public access for a database by creating a NodePort service.',
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
          '200': {
            description: 'Public access enabled successfully',
            content: {
              'application/json': {
                schema: enablePublicAccessSchemas.response
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid parameters'
          },
          '404': {
            description: 'Database not found'
          },
          '409': {
            description: 'Conflict - Public access already enabled'
          },
          '500': {
            description: 'Internal Server Error'
          }
        }
      }
    },
    '/database/{databaseName}/disablePublic': {
      post: {
        summary: 'Disable Public Access',
        description: 'Disable public access for a database by deleting the NodePort service.',
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
          '200': {
            description: 'Public access disabled successfully',
            content: {
              'application/json': {
                schema: disablePublicAccessSchemas.response
              }
            }
          },
          '404': {
            description: 'Public access not enabled for this database'
          },
          '500': {
            description: 'Internal Server Error'
          }
        }
      }
    },
    '/database/version/list': {
      get: {
        summary: 'Get Database Versions',
        description: 'Get database versions.',
        security: [{ KubeconfigAuth: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: databaseVersionListSchemas.response
              }
            }
          }
        }
      }
    },
    '/logs/data': {
      get: {
        summary: 'Get Logs Files',
        description: 'Get logs files.',
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'podName',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Pod name'
          },
          {
            name: 'dbType',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              enum: ['mysql', 'mongodb', 'redis', 'postgresql']
            },
            description: 'Database type'
          },
          {
            name: 'logType',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Log type'
          },
          {
            name: 'logPath',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Log path'
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1
            },
            description: 'Page number'
          },
          {
            name: 'pageSize',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1
            },
            description: 'Page size'
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: logsDataSchemas.response
              }
            }
          }
        }
      }
    },
    '/logs/files': {
      get: {
        summary: 'Get Logs File',
        description: 'Get logs file.',
        security: [{ KubeconfigAuth: [] }],
        parameters: [
          {
            name: 'podName',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Pod name'
          },
          {
            name: 'dbType',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              enum: ['mysql', 'mongodb', 'redis', 'postgresql']
            },
            description: 'Database type'
          },
          {
            name: 'logType',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Log type'
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: logsFileSchemas.response
              }
            }
          }
        }
      }
    }
  }
});
