import { SupportReconfigureDBType } from '@/types/db';
import { TFile } from '@/utils/kubeFileSystem';

export interface LogConfig {
  path: string;
  containerNames: string[];
  filter: (files: TFile[]) => TFile[];
}

export interface LoggingConfiguration {
  slow?: LogConfig; // For slow operation logs
  error?: LogConfig; // For error logs
  wal?: LogConfig; // For Write-Ahead Logs
  operation?: LogConfig; // For operation/audit logs
}

export const ServiceLogConfigs: Record<SupportReconfigureDBType, LoggingConfiguration> = {
  redis: {
    error: {
      path: '/data/running.log',
      containerNames: ['redis', 'lorry'],
      filter: (files: TFile[]) =>
        files
          .filter((f) => f.size > 0 && f.name.toLowerCase().endsWith('.log'))
          .sort((a, b) => b.updateTime.getTime() - a.updateTime.getTime())
    }
  },
  postgresql: {
    error: {
      path: '/home/postgres/pgdata/pgroot/pg_log',
      containerNames: ['postgresql', 'lorry'],
      filter: (files: TFile[]) =>
        files
          .filter((f) => f.size > 0 && f.name.toLowerCase().endsWith('.csv'))
          .sort((a, b) => b.updateTime.getTime() - a.updateTime.getTime())
    }
  },
  mongodb: {
    error: {
      path: '/data/mongodb/mongodb.log',
      containerNames: ['mongodb'],
      filter: (files: TFile[]) => {
        return files;
      }
    }
  },
  'apecloud-mysql': {
    error: {
      path: '/var/log/mysql/error.log',
      containerNames: ['mysql'],
      filter: (files: TFile[]) =>
        files
          .filter((f) => f.size > 0 && f.name.toLowerCase().endsWith('.log'))
          .sort((a, b) => b.updateTime.getTime() - a.updateTime.getTime())
    },
    slow: {
      path: '/var/log/mysql/slow.log',
      containerNames: ['mysql'],
      filter: (files: TFile[]) =>
        files
          .filter((f) => f.size > 0 && f.name.toLowerCase().endsWith('.log'))
          .sort((a, b) => b.updateTime.getTime() - a.updateTime.getTime())
    }
  }
};
