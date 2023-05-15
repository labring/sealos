import dayjs from 'dayjs';
import type { CoreV1EventList, V1Pod } from '@kubernetes/client-node';
import type { DBListItemType, DBDetailType, DBEditType, PodDetailType, PodEvent } from '@/types/db';
import { dbStatusMap, podStatusMap } from '@/constants/db';
import { cpuFormatToM, memoryFormatToMi, storageFormatToNum } from '@/utils/tools';
import type { KbPgClusterType, KbPodType } from '@/types/cluster';
import { formatPodTime } from '@/utils/tools';
import type { BackupItemType } from '../types/db';
import type { BackupCRItemType } from '@/types/backup';
import { backupStatusMap } from '@/constants/backup';

export const adaptDBListItem = (db: KbPgClusterType): DBListItemType => {
  // compute store amount
  return {
    id: db.metadata?.uid || ``,
    name: db.metadata?.name || 'db name',
    dbType: db?.metadata?.labels['clusterdefinition.kubeblocks.io/name'] || 'postgresql',
    status:
      db?.status?.phase && dbStatusMap[db?.status?.phase]
        ? dbStatusMap[db?.status?.phase]
        : dbStatusMap.UnKnow,
    createTime: dayjs(db.metadata?.creationTimestamp).format('YYYY/MM/DD hh:mm'),
    cpu: cpuFormatToM(db.spec?.componentSpecs?.[0]?.resources.limits.cpu),
    memory: cpuFormatToM(db.spec?.componentSpecs?.[0]?.resources.limits.memory),
    storage:
      db.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage ||
      '-',
    conditions: db.status.conditions || []
  };
};

export const adaptDBDetail = (db: KbPgClusterType): DBDetailType => {
  return {
    id: db.metadata?.uid || ``,
    createTime: dayjs(db.metadata?.creationTimestamp).format('YYYY/MM/DD hh:mm'),
    status:
      db?.status?.phase && dbStatusMap[db?.status?.phase]
        ? dbStatusMap[db?.status?.phase]
        : dbStatusMap.UnKnow,
    dbType: db?.metadata?.labels['clusterdefinition.kubeblocks.io/name'] || 'postgresql',
    dbVersion: db?.metadata?.labels['clusterversion.kubeblocks.io/name'] || '',
    dbName: db.metadata?.name || 'db name',
    replicas: db.spec?.componentSpecs?.[0]?.replicas || 1,
    cpu: cpuFormatToM(db.spec?.componentSpecs?.[0]?.resources.limits.cpu),
    memory: memoryFormatToMi(db.spec?.componentSpecs?.[0]?.resources.limits.memory),
    storage: storageFormatToNum(
      db.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage
    ),
    conditions: db.status.conditions || []
  };
};

export const adaptDBForm = (db: DBDetailType): DBEditType => {
  const keys: Record<keyof DBEditType, any> = {
    dbType: 1,
    dbVersion: 1,
    dbName: 1,
    cpu: 1,
    memory: 1,
    replicas: 1,
    storage: 1
  };
  const form: any = {};

  for (const key in keys) {
    // @ts-ignore
    form[key] = db[key];
  }

  return form;
};

export const adaptPod = (pod: V1Pod): PodDetailType => {
  return {
    ...pod,
    podName: pod.metadata?.name || 'pod name',
    // @ts-ignore
    status: podStatusMap[pod.status?.phase] || podStatusMap.Failed,
    nodeName: pod.spec?.nodeName || 'node name',
    ip: pod.status?.podIP || 'pod ip',
    restarts: pod.status?.containerStatuses ? pod.status?.containerStatuses[0].restartCount : 0,
    age: formatPodTime(pod.metadata?.creationTimestamp),
    cpu: cpuFormatToM(pod.spec?.containers?.[0]?.resources?.limits?.cpu || '0'),
    memory: memoryFormatToMi(pod.spec?.containers?.[0]?.resources?.limits?.memory || '0')
  };
};

export const adaptEvents = (events: CoreV1EventList): PodEvent[] => {
  return events.items
    .sort((a, b) => {
      const lastTimeA = a.lastTimestamp || a.eventTime;
      const lastTimeB = b.lastTimestamp || b.eventTime;

      if (!lastTimeA || !lastTimeB) return 1;
      return new Date(lastTimeB).getTime() - new Date(lastTimeA).getTime();
    })
    .map((item) => ({
      id: item.metadata.uid || `${Date.now()}`,
      reason: item.reason || '',
      message: item.message || '',
      count: item.count || 0,
      type: item.type || 'Warning',
      firstTime: formatPodTime(item.firstTimestamp || item.metadata?.creationTimestamp),
      lastTime: formatPodTime(item.lastTimestamp || item?.eventTime)
    }));
};

export const adaptBackup = (backup: BackupCRItemType): BackupItemType => {
  return {
    id: backup.metadata.uid,
    name: backup.metadata.name,
    status: backupStatusMap[backup.status.phase],
    startTime: backup.status.startTimestamp,
    endTime: backup.status.completionTimestamp,
    storage: 10,
    type: 'manual'
  };
};
