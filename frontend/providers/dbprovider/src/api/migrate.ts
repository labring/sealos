import { DELETE, GET, POST } from '@/services/request';
import { DumpForm, InternetMigrationCR } from '@/types/migrate';
import { adaptMigrateList } from '@/utils/adapt';
import { V1Pod } from '@kubernetes/client-node';

export const getMigrateList = (migrateName: string) =>
  GET<InternetMigrationCR[]>('/api/migrate/list', { migrateName }).then((res) =>
    res.map(adaptMigrateList).sort((a, b) => {
      const startTimeA = new Date(a.startTime).getTime();
      const startTimeB = new Date(b.startTime).getTime();
      return startTimeB - startTimeA;
    })
  );

export const deleteMigrateByName = (migrateName: string) =>
  DELETE<InternetMigrationCR[]>('/api/migrate/delete', { migrateName });

export const getMigratePodList = (
  migrateName: string,
  migrateType: 'network' | 'file' = 'network'
) =>
  GET<V1Pod[]>('/api/migrate/getPodList', { migrateName, migrateType }).then((res) => {
    return res.sort((a, b) => {
      const startTimeA = new Date(a.metadata?.creationTimestamp || '').getTime();
      const startTimeB = new Date(b.metadata?.creationTimestamp || '').getTime();
      return startTimeA - startTimeB;
    });
  });

export const getLogByNameAndContainerName = (data: {
  containerName: string;
  podName: string;
  stream: boolean;
  logSize?: number;
}) => POST<string>('/api/migrate/getLogByName', data);

export const getPodStatusByName = (podName: string) =>
  GET(`/api/pod/getPodStatus?podName=${podName}`);

export const deleteMigrateJobByName = (name: string) =>
  DELETE(`/api/migrate/delJobByName?name=${name}`);

export const applyDumpCR = (data: DumpForm) =>
  POST<{ name: string }>('/api/migrate/createDump', data);
