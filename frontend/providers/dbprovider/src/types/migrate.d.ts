import { DBType } from './db';

export enum InternetMigrationTemplate {
  postgresql = 'apecloud-pg2pg',
  mongodb = 'apecloud-mongo2mongo',
  mysql = 'apecloud-mysql2mysql'
}

export type InternetMigrationCR = {
  apiVersion: 'datamigration.apecloud.io/v1alpha1';
  kind: 'MigrationTask';
  metadata: {
    name: string;
    creationTimestamp: string;
    uid: string;
    labels: Record<string, string>;
  };
  spec: {
    cdc: {
      config: {
        param: {
          'extractor.server_id': 1565001796;
        };
      };
    };
    initialization: {
      steps: ['preCheck', 'initStruct', 'initData'];
    };
    sinkEndpoint: {
      address: string;
      password: string;
      userName: string;
    };
    sourceEndpoint: {
      address: string;
      password: string;
      userName: string;
    };
    migrationObj: {
      whiteList: [
        {
          isAll: false;
          schemaName: string;
          tableList: [
            {
              isAll: true;
              tableName: string;
            },
            {
              isAll: true;
              tableName: string;
            }
          ];
        }
      ];
    };
    taskType: string;
    template: string;
  };
  status: {
    initialization: {
      startTime: '2023-11-09T06:53:26Z';
    };
    startTime: string;
    taskStatus: string;
  };
};

export type DumpImportCR = {
  apiVersion: 'batch/v1';
  kind: 'Job';
  metadata: {
    name: 'ns_data_migration_internal';
  };
  spec: {
    template: {
      metadata: {
        name: 'ns_data_migration_internal';
      };
      spec: {
        restartPolicy: 'Never';
        containers: [
          {
            name: 'migration_pod';
            image: 'ghcr.io/wallyxjh/test:6.3';
          }
        ];
      };
    };
  };
};

export type MigrateForm = {
  dbType: DBType;
  dbVersion: string;
  dbName: string;
  replicas: number;
  cpu: number;
  memory: number;
  storage: number;

  sinkHost: string;
  sinkPort: string;
  sinkPassword: string;
  sinkUser: string;
  sourceHost: string;
  sourcePort: string;
  sourceUsername: string;
  sourcePassword: string;
  sourceDatabase: string;
  sourceDatabaseTable: string[];
  isChecked: boolean;
  continued: boolean;
  remark?: string;
};

export interface MigrateItemType {
  id: string;
  name: string;
  remark: string;
  status: string;
  startTime: string;
}

export type DumpForm = {
  databaseUser: string;
  databasePassword: string;
  databaseHost: string;
  fileName: string;
  databaseType: string;
  databaseName: string;
  collectionName: string;
  tablesName: string;
  dbName: string;
};
