import { BACKUP_REMARK_LABEL_KEY, BackupTypeEnum, backupStatusMap } from '@/constants/backup';
import {
  DBBackupMethodNameMap,
  DBNameLabel,
  DBPreviousConfigKey,
  DBReconfigStatusMap,
  DBSourceConfigs,
  MigrationRemark,
  dbStatusMap
} from '@/constants/db';
import type { AutoBackupFormType, AutoBackupType, BackupCRItemType } from '@/types/backup';
import type { KbPgClusterType, KubeBlockOpsRequestType } from '@/types/cluster';
import type {
  DBDetailType,
  DBEditType,
  DBListItemType,
  DBSourceType,
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
import { has } from 'lodash';
import type { BackupItemType } from '../types/db';

export const getDBSource = (
  db: KbPgClusterType
): {
  hasSource: boolean;
  sourceName: string;
  sourceType: DBSourceType;
} => {
  const labels = db.metadata?.labels || {};

  for (const config of DBSourceConfigs) {
    if (has(labels, config.key)) {
      return {
        hasSource: true,
        sourceName: labels[config.key],
        sourceType: config.type
      };
    }
  }

  return {
    hasSource: false,
    sourceName: '',
    sourceType: 'app_store'
  };
};

export const adaptDBListItem = (db: KbPgClusterType): DBListItemType => {
  let cpu = 0;
  let memory = 0;
  let storage = 0;
  db.spec?.componentSpecs.forEach((comp) => {
    cpu += cpuFormatToM(comp?.resources?.limits?.cpu || '0');
    memory += memoryFormatToMi(comp?.resources?.limits?.memory || '0');
    storage += storageFormatToNum(
      comp?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage || '0'
    );
  });

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
    cpu,
    memory,
    storage: storage.toString() || '-',
    conditions: db?.status?.conditions || [],
    isDiskSpaceOverflow: false,
    labels: db.metadata.labels || {},
    source: getDBSource(db)
  };
};

export const adaptDBDetail = (db: KbPgClusterType): DBDetailType => {
  let cpu = 0;
  let memory = 0;
  let storage = 0;
  db.spec?.componentSpecs.forEach((comp) => {
    cpu += cpuFormatToM(comp?.resources?.limits?.cpu || '0');
    memory += memoryFormatToMi(comp?.resources?.limits?.memory || '0');
    storage += storageFormatToNum(
      comp?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage || '0'
    );
  });

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
    cpu,
    memory,
    storage,
    conditions: db?.status?.conditions || [],
    isDiskSpaceOverflow: false,
    labels: db.metadata.labels || {},
    source: getDBSource(db),
    autoBackup: adaptBackupByCluster(db),
    terminationPolicy: db.spec?.terminationPolicy || 'Delete'
  };
};

export const adaptBackupByCluster = (db: KbPgClusterType): AutoBackupFormType => {
  const backup =
    db.spec?.backup && db.spec?.backup?.cronExpression
      ? adaptPolicy(db.spec.backup)
      : {
          start: false,
          hour: '18',
          minute: '00',
          week: [],
          type: 'day' as AutoBackupType,
          saveTime: 7,
          saveType: 'd'
        };
  return backup;
};

export const convertBackupFormToSpec = (data: {
  autoBackup?: AutoBackupFormType;
  dbType: DBType;
}): KbPgClusterType['spec']['backup'] => {
  const cron = (() => {
    if (data.autoBackup?.type === 'week') {
      if (!data.autoBackup?.week?.length) {
        throw new Error('Week is empty');
      }
      return `${data.autoBackup.minute} ${data.autoBackup.hour} * * ${data.autoBackup.week.join(
        ','
      )}`;
    }
    if (data.autoBackup?.type === 'day') {
      return `${data.autoBackup.minute} ${data.autoBackup.hour} * * *`;
    }
    return `${data.autoBackup?.minute} * * * *`;
  })();

  return {
    enabled: data.autoBackup?.start ?? false,
    cronExpression: convertCronTime(cron, -8),
    method: DBBackupMethodNameMap[data.dbType],
    retentionPeriod: `${data.autoBackup?.saveTime}${data.autoBackup?.saveType}`,
    repoName: '',
    pitrEnabled: false
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
    storage: 1,
    labels: 1,
    autoBackup: 1,
    terminationPolicy: 1
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
  const dbType = backup.metadata.labels['apps.kubeblocks.io/component-name'] || 'postgresql';

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
    connectionPassword: backup.metadata?.annotations?.[passwordLabel],
    dbName: backup.metadata.labels[DBNameLabel],
    dbType: dbType === 'mysql' ? 'apecloud-mysql' : dbType
  };
};

export const adaptPolicy = (policy: KbPgClusterType['spec']['backup']): AutoBackupFormType => {
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

  const { number: saveTime, unit: saveType } = parseDate(policy.retentionPeriod);
  const { hour, minute, week, type } = parseCron(policy?.cronExpression ?? '0 0 * * *');

  return {
    start: policy.enabled,
    type: type as AutoBackupType,
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
