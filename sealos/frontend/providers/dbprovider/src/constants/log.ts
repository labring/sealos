import { SupportReconfigureDBType } from '@/types/db';
import { TFile } from '@/utils/kubeFileSystem';

export enum LogTypeEnum {
  RuntimeLog = 'runtimeLog',
  SlowQuery = 'slowQuery',
  ErrorLog = 'errorLog'
}

export type LogConfig = {
  path: string;
  containerNames: string[];
  filter: (files: TFile[]) => TFile[];
};

export type LoggingConfiguration = {
  [LogTypeEnum.RuntimeLog]?: LogConfig;
  [LogTypeEnum.SlowQuery]?: LogConfig;
  [LogTypeEnum.ErrorLog]?: LogConfig;
};

export const ServiceLogConfigs: Record<SupportReconfigureDBType, LoggingConfiguration> = {
  redis: {
    [LogTypeEnum.RuntimeLog]: {
      path: '/data/running.log',
      containerNames: ['redis', 'lorry'],
      filter: (files: TFile[]) =>
        files
          .filter((f) => f.size > 0 && f.name.toLowerCase().endsWith('.log'))
          .sort((a, b) => b.updateTime.getTime() - a.updateTime.getTime())
    }
  },
  postgresql: {
    [LogTypeEnum.RuntimeLog]: {
      path: '/home/postgres/pgdata/pgroot/pg_log',
      containerNames: ['postgresql', 'lorry'],
      filter: (files: TFile[]) =>
        files
          .filter((f) => f.size > 0 && f.name.toLowerCase().endsWith('.csv'))
          .sort((a, b) => b.updateTime.getTime() - a.updateTime.getTime())
    }
  },
  mongodb: {
    [LogTypeEnum.RuntimeLog]: {
      path: '/data/mongodb/mongodb.log',
      containerNames: ['mongodb'],
      filter: (files: TFile[]) => {
        return files;
      }
    }
  },
  'apecloud-mysql': {
    [LogTypeEnum.ErrorLog]: {
      path: '/data/mysql/log',
      containerNames: ['mysql', 'lorry'],
      filter: (files: TFile[]) =>
        files
          .filter((f) => f.size > 0 && f.name.toLowerCase().includes('mysqld-error'))
          .sort((a, b) => b.updateTime.getTime() - a.updateTime.getTime())
    },
    [LogTypeEnum.SlowQuery]: {
      path: '/data/mysql/log',
      containerNames: ['mysql', 'lorry'],
      filter: (files: TFile[]) => {
        console.log('slow query files:', files);
        return files
          .filter((f) => f.size > 1024 && f.name.toLowerCase().includes('slow-query'))
          .sort((a, b) => b.updateTime.getTime() - a.updateTime.getTime());
      }
    }
  }
};
