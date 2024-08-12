import { BACKUP_REMARK_LABEL_KEY, BackupTypeEnum, backupStatusMap } from '@/constants/backup';
import {
  DBReconfigStatusMap,
  DBStatusEnum,
  DBReconfigureMap,
  MigrationRemark,
  dbStatusMap,
  DBReconfigureKey,
  DBPreviousConfigKey
} from '@/constants/db';
import type { AutoBackupFormType, BackupCRItemType } from '@/types/backup';
import type {
  KbPgClusterType,
  KubeBlockBackupPolicyType,
  KubeBlockOpsRequestType
} from '@/types/cluster';
import type {
  DBDetailType,
  DBEditType,
  DBListItemType,
  DBType,
  OpsRequestItemType,
  PodDetailType,
  PodEvent
} from '@/types/db';
import { InternetMigrationCR, MigrateItemType } from '@/types/migrate';
import {
  convertCronTime,
  cpuFormatToM,
  decodeFromHex,
  formatPodTime,
  formatTime,
  memoryFormatToMi,
  storageFormatToNum
} from '@/utils/tools';
import type { CoreV1EventList, V1Pod } from '@kubernetes/client-node';
import dayjs from 'dayjs';
import type { BackupItemType } from '../types/db';

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
    createTime: dayjs(db.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(db.spec?.componentSpecs?.[0]?.resources?.limits?.cpu),
    memory: cpuFormatToM(db.spec?.componentSpecs?.[0]?.resources?.limits?.memory),
    storage:
      db.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage ||
      '-',
    conditions: db?.status?.conditions || [],
    isDiskSpaceOverflow: false,
    labels: db.metadata.labels || {}
  };
};

export const adaptDBDetail = (db: KbPgClusterType): DBDetailType => {
  return {
    id: db.metadata?.uid || ``,
    createTime: dayjs(db.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
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
    conditions: db?.status?.conditions || [],
    isDiskSpaceOverflow: false,
    labels: db.metadata.labels || {}
  };
};

export const adaptBackupByCluster = (db: KbPgClusterType): AutoBackupFormType => {
  const backup = db.spec.backup
    ? adaptPolicy({
        metadata: {
          name: db.metadata.name,
          uid: db.metadata.uid
        },
        spec: {
          retention: {
            ttl: db.spec.backup.retentionPeriod
          },
          schedule: {
            datafile: {
              cronExpression: db.spec.backup.cronExpression,
              enable: db.spec.backup.enabled
            }
          }
        }
      })
    : {
        start: false,
        hour: '18',
        minute: '00',
        week: [],
        type: 'day',
        saveTime: 7,
        saveType: 'd'
      };
  return backup;
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
    status: pod.status?.containerStatuses || [],
    nodeName: pod.spec?.nodeName || 'node name',
    hostIp: pod.status?.hostIP || 'host ip',
    ip: pod.status?.podIP || 'pod ip',
    restarts: pod.status?.containerStatuses
      ? pod.status?.containerStatuses.reduce((sum, item) => sum + item.restartCount, 0)
      : 0,
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
  const autoLabel = 'dataprotection.kubeblocks.io/autobackup';
  const passwordLabel = 'dataprotection.kubeblocks.io/connection-password';
  const remark = backup.metadata.labels[BACKUP_REMARK_LABEL_KEY];

  return {
    id: backup.metadata.uid,
    name: backup.metadata.name,
    namespace: backup.metadata.namespace,
    status:
      backup.status?.phase && backupStatusMap[backup.status.phase]
        ? backupStatusMap[backup.status.phase]
        : backupStatusMap.UnKnow,
    startTime: backup.metadata.creationTimestamp,
    type: autoLabel in backup.metadata.labels ? BackupTypeEnum.auto : BackupTypeEnum.manual,
    remark: remark ? decodeFromHex(remark) : '-',
    failureReason: backup.status?.failureReason,
    connectionPassword: backup.metadata?.annotations?.[passwordLabel]
  };
};

export const adaptPolicy = (policy: KubeBlockBackupPolicyType): AutoBackupFormType => {
  function parseDate(str: string) {
    const regex = /(\d+)([a-zA-Z]+)/;
    const matches = str.match(regex);

    if (matches && matches.length === 3) {
      const number = parseInt(matches[1]);
      const unit = matches[2];

      return { number, unit };
    }

    return { number: 7, unit: 'd' };
  }
  function parseCron(str: string) {
    const cronFields = convertCronTime(str, 8).split(' ');
    const minuteField = cronFields[0];
    const hourField = cronFields[1];
    const weekField = cronFields[4];

    //  week task
    if (weekField !== '*') {
      return {
        hour: hourField.padStart(2, '0'),
        minute: minuteField.padStart(2, '0'),
        week: weekField.split(','),
        type: 'week'
      };
    }
    console.log(minuteField, hourField, weekField);

    // every day
    if (hourField !== '*') {
      return {
        hour: hourField.padStart(2, '0'),
        minute: minuteField.padStart(2, '0'),
        week: [],
        type: 'day'
      };
    }

    // every hour
    if (minuteField !== '*') {
      return {
        hour: '00',
        minute: minuteField.padStart(2, '0'),
        week: [],
        type: 'hour'
      };
    }

    return {
      hour: '18',
      minute: '00',
      week: [],
      type: 'day'
    };
  }

  const { number: saveTime, unit: saveType } = parseDate(policy.spec.retention.ttl);
  const { hour, minute, week, type } = parseCron(policy.spec.schedule.datafile.cronExpression);

  return {
    start: policy.spec.schedule.datafile.enable,
    type,
    week,
    hour,
    minute,
    saveTime,
    saveType
  };
};

export const adaptMigrateList = (item: InternetMigrationCR): MigrateItemType => {
  return {
    id: item.metadata?.uid,
    name: item.metadata?.name,
    status: item.status?.taskStatus,
    startTime: formatTime(item.metadata?.creationTimestamp || ''),
    remark: item.metadata.labels[MigrationRemark] || '-'
  };
};

export const adaptOpsRequest = (
  item: KubeBlockOpsRequestType,
  dbType: DBType
): OpsRequestItemType => {
  const config = item.metadata.annotations?.[DBPreviousConfigKey];

  let previousConfigurations: {
    [key: string]: string;
  } = {};

  if (config) {
    try {
      const confObject = JSON.parse(config);
      Object.entries(confObject).forEach(([key, value]) => {
        previousConfigurations[key] =
          typeof value === 'string' ? value.replace(/^['"](.*)['"]$/, '$1') : String(value);
      });
    } catch (error) {
      console.error('Error parsing postgresql.conf annotation:', error);
    }
  }

  return {
    id: item.metadata.uid,
    name: item.metadata.name,
    namespace: item.metadata.namespace,
    status:
      item.status?.phase && DBReconfigStatusMap[item.status.phase]
        ? DBReconfigStatusMap[item.status.phase]
        : DBReconfigStatusMap.Creating,
    startTime: item.metadata?.creationTimestamp,
    configurations: item.spec.reconfigure.configurations[0].keys[0].parameters.map((param) => ({
      parameterName: param.key,
      newValue: param.value,
      oldValue: previousConfigurations[param.key]
    }))
  };
};
