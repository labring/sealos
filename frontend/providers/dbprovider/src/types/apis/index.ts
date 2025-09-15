import { createDocument } from 'zod-openapi';

import * as createDatabaseSchemas from './database/create-database';
export * as createDatabaseSchemas from './database/create-database';

import * as updateDatabaseSchemas from './database/update-database';
export * as updateDatabaseSchemas from './database/update-database';

import * as startDatabaseSchemas from './database/start-database';
export * as startDatabaseSchemas from './database/start-database';

import * as pauseDatabaseSchemas from './database/pause-database';
export * as pauseDatabaseSchemas from './database/pause-database';

import * as getDatabaseSchemas from './database/get-database';
export * as getDatabaseSchemas from './database/get-database';

import * as deleteDatabaseSchemas from './database/delete-database';
export * as deleteDatabaseSchemas from './database/delete-database';

import * as logsDataSchemas from './logs/data';
export * as logsDataSchemas from './logs/data';

import * as logsFileSchemas from './logs/file';
export * as logsFileSchemas from './logs/file';

import * as databaseVersionListSchemas from './database/version/list';

import * as createBackupSchemas from './backup/create-backup';
export * as createBackupSchemas from './backup/create-backup';

import * as deleteBackupSchemas from './backup/delete-backup';
export * as deleteBackupSchemas from './backup/delete-backup';

import * as restoreBackupSchemas from './backup/restore-backup';
export * as restoreBackupSchemas from './backup/restore-backup';

import * as enablePublicAccessSchemas from './network/enable-public-access';
export * as enablePublicAccessSchemas from './network/enable-public-access';

import * as disablePublicAccessSchemas from './network/disable-public-access';
export * as disablePublicAccessSchemas from './network/disable-public-access';

export const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Database API',
    version: '1.0.0'
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
    }
  },
  paths: {
    '/database': {
      post: {
        summary: 'Create Database',
        description: 'Create a new database.',
        security: [
          {
            KubeconfigAuth: []
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: createDatabaseSchemas.body
            }
          }
        },
        responses: {
          '200': {
            description: 'Created',
            content: {
              'application/json': {
                schema: createDatabaseSchemas.response
              }
            }
          },
          '400': {
            description: 'Bad Request'
          }
        }
      }
    },
    '/database/{databaseName}': {
      patch: {
        summary: 'Update Database',
        description: "Update a database's resource limit.",
        security: [{ KubeconfigAuth: [] }],
        requestParams: {
          path: updateDatabaseSchemas.pathParams
        },
        requestBody: {
          content: {
            'application/json': {
              schema: updateDatabaseSchemas.body
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: updateDatabaseSchemas.response
              }
            }
          },
          '400': {
            description: 'Bad Request'
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
        requestParams: {
          path: getDatabaseSchemas.pathParams
        },
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
        requestParams: {
          path: deleteDatabaseSchemas.pathParams
        },
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
        requestParams: {
          path: startDatabaseSchemas.pathParams
        },
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
        requestParams: {
          path: pauseDatabaseSchemas.pathParams
        },
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
        requestParams: {
          query: logsDataSchemas.query
        },
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
        requestParams: {
          query: logsFileSchemas.query
        },
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
    },
    '/backup/create': {
      post: {
        summary: 'Create Backup',
        description: 'Create a manual backup for a database.',
        security: [{ KubeconfigAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: createBackupSchemas.body
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: createBackupSchemas.response
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid parameters'
          },
          '500': {
            description: 'Internal Server Error'
          }
        }
      }
    },
    '/backup/delBackup': {
      delete: {
        summary: 'Delete Backup',
        description: 'Delete a backup by name.',
        security: [{ KubeconfigAuth: [] }],
        requestParams: {
          query: deleteBackupSchemas.queryParams
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: deleteBackupSchemas.response
              }
            }
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
    '/backup/restore': {
      post: {
        summary: 'Restore Backup',
        description: 'Restore a database from a backup by creating a new database.',
        security: [{ KubeconfigAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: restoreBackupSchemas.body
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: restoreBackupSchemas.response
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid parameters'
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
    '/applyYamlList': {
      post: {
        summary: 'Apply YAML List',
        description:
          'Apply a list of YAML resources to Kubernetes cluster. Used for enabling public access by creating network services.',
        security: [{ KubeconfigAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: enablePublicAccessSchemas.body
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: enablePublicAccessSchemas.response
              }
            }
          },
          '400': {
            description: 'Bad Request - Invalid parameters'
          },
          '500': {
            description: 'Internal Server Error'
          }
        }
      }
    },
    '/delServiceByName': {
      delete: {
        summary: 'Delete Service by Name',
        description:
          'Delete a Kubernetes service by name. Used for disabling public access by removing network services.',
        security: [{ KubeconfigAuth: [] }],
        requestParams: {
          query: disablePublicAccessSchemas.queryParams
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: disablePublicAccessSchemas.response
              }
            }
          },
          '404': {
            description: 'Service not found'
          },
          '500': {
            description: 'Internal Server Error'
          }
        }
      }
    }
  }
});
