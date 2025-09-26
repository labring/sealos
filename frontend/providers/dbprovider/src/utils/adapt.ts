import { BACKUP_REMARK_LABEL_KEY, BackupTypeEnum, backupStatusMap } from '@/constants/backup';
import { DB_REMARK_KEY } from '@/constants/db';
import {
  DBBackupMethodNameMap,
  DBComponentNameMap,
  DBNameLabel,
  DBPreviousConfigKey,
  DBReconfigStatusMap,
  DBSourceConfigs,
  MigrationRemark,
  dbStatusMap
} from '@/constants/db';
import type { AutoBackupFormType, AutoBackupType, BackupCRItemType } from '@/types/backup';
import type {
  KbPgClusterType,
  KubeBlockClusterSpec,
  KubeBlockOpsRequestType
} from '@/types/cluster';
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
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { has } from 'lodash';

dayjs.extend(utc);
dayjs.extend(timezone);
import type { BackupItemType } from '../types/db';
import z from 'zod';
import { dbDetailSchema, dbEditSchema, dbTypeSchema } from '@/types/schemas/db';

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

/**
 * Calculate resource usage for a cluster.
 * cpu/memory/storage: only the main node (first component) resources.
 * totalCpu/totalMemory/totalStorage: sum of all nodes.
 */
function calcTotalResource(obj: KubeBlockClusterSpec['componentSpecs']) {
  let cpu = 0;
  let memory = 0;
  let storage = 0;
  let totalCpu = 0;
  let totalMemory = 0;
  let totalStorage = 0;

  if (!Array.isArray(obj) || obj.length === 0) {
    return {
      cpu: 0,
      memory: 0,
      totalCpu: 0,
      totalMemory: 0,
      storage: 0,
      totalStorage: 0
    };
  }

  const mainComp = obj[0];
  const mainCpu = cpuFormatToM(mainComp?.resources?.limits?.cpu || '0');
  const mainMemory = memoryFormatToMi(mainComp?.resources?.limits?.memory || '0');
  const mainStorage = (mainComp?.volumeClaimTemplates || []).reduce((total, volume) => {
    return total + storageFormatToNum(volume?.spec?.resources?.requests?.storage || '0');
  }, 0);
  cpu = mainCpu;
  memory = mainMemory;
  storage = mainStorage;

  obj.forEach((comp) => {
    const parseCpu = cpuFormatToM(comp?.resources?.limits?.cpu || '0');
    const parseMemory = memoryFormatToMi(comp?.resources?.limits?.memory || '0');
    const parseStorage = (comp?.volumeClaimTemplates || []).reduce((total, volume) => {
      return total + storageFormatToNum(volume?.spec?.resources?.requests?.storage || '0');
    }, 0);
    totalCpu += parseCpu * (comp.replicas || 1);
    totalMemory += parseMemory * (comp.replicas || 1);
    totalStorage += parseStorage * (comp.replicas || 1);
  });

  return {
    cpu,
    memory,
    totalCpu,
    totalMemory,
    storage,
    totalStorage
  };
}

export const adaptDBListItem = (db: KbPgClusterType): DBListItemType => {
  const labels = db?.metadata?.labels || {};
  const kbDatabase = labels['kb.io/database'];
  let dbType = '';
  let dbVersion = '';

  // All databases now use kb.io/database for version information
  if (kbDatabase) {
    // Parse database type and version from kb.io/database
    if (kbDatabase.startsWith('ac-mysql')) {
      dbType = 'apecloud-mysql';
      dbVersion = kbDatabase;
    } else {
      const [type, ...versionParts] = kbDatabase.split('-');
      dbType = type;
      dbVersion = kbDatabase; // Use full kb.io/database value as version
    }
  } else {
    // Fallback: if kb.io/database is not available, try other sources
    if (labels['clusterdefinition.kubeblocks.io/name']) {
      dbType = labels['clusterdefinition.kubeblocks.io/name'];
      dbVersion = labels['clusterversion.kubeblocks.io/name'] || '';
    } else {
      // ComponentVersion approach - infer from componentSpecs or helm chart
      const componentDefRef = db.spec?.componentSpecs?.[0]?.componentDefRef;
      const helmChart = labels['helm.sh/chart'];

      if (componentDefRef) {
        dbType = componentDefRef;
        if (componentDefRef === ('mysql' as any)) {
          dbType = 'apecloud-mysql';
        }
      } else if (helmChart) {
        if (helmChart.includes('mongodb')) {
          dbType = 'mongodb';
        } else if (helmChart.includes('redis')) {
          dbType = 'redis';
        } else if (helmChart.includes('mysql')) {
          dbType = 'apecloud-mysql';
        } else if (helmChart.includes('postgresql')) {
          dbType = 'postgresql';
        }
      }

      dbVersion =
        labels['app.kubernetes.io/version'] ||
        (db.spec?.componentSpecs?.[0] as any)?.serviceVersion ||
        '';

      if (!dbType) {
        dbType = 'postgresql';
      }
    }
  }
  // compute store amount
  return {
    id: db.metadata?.uid || ``,
    name: db.metadata?.name || 'db name',
    dbType: dbType as DBType,
    status:
      db?.status?.phase && dbStatusMap[db?.status?.phase]
        ? dbStatusMap[db?.status?.phase]
        : dbStatusMap.UnKnow,
    createTime: dayjs(db.metadata?.creationTimestamp)
      .tz('Asia/Shanghai')
      .format('YYYY/MM/DD HH:mm'),
    ...calcTotalResource(db.spec.componentSpecs),
    replicas: (() => {
      // Find component by matching with DBComponentNameMap
      const componentNames = DBComponentNameMap[dbType as DBType] || [];
      const matchingComponent = db.spec?.componentSpecs.find(
        (comp) => componentNames.includes(comp.name as any) || comp.name === dbType
      );
      return matchingComponent?.replicas || 1;
    })(),
    conditions: db?.status?.conditions || [],
    isDiskSpaceOverflow: false,
    labels: db.metadata.labels || {},
    source: getDBSource(db),
    remark: db.metadata?.annotations?.[DB_REMARK_KEY] || ''
  };
};

export const adaptDBDetail = (db: KbPgClusterType): DBDetailType => {
  const labels = db?.metadata?.labels || {};
  const kbDatabase = labels['kb.io/database'];
  let dbType = '';
  let dbVersion = '';

  // All databases now use kb.io/database for version information
  if (kbDatabase) {
    // Parse database type and version from kb.io/database
    if (kbDatabase.startsWith('ac-mysql')) {
      dbType = 'apecloud-mysql';
      dbVersion = kbDatabase;
    } else {
      const [type, ...versionParts] = kbDatabase.split('-');
      dbType = type;
      dbVersion = kbDatabase; // Use full kb.io/database value as version
    }
  } else {
    // Fallback: if kb.io/database is not available, try other sources
    // First try clusterdefinition label
    dbType = labels['clusterdefinition.kubeblocks.io/name'] || '';

    // If still no dbType, try to infer from componentSpecs or helm chart
    if (!dbType) {
      const componentDefRef = db.spec?.componentSpecs?.[0]?.componentDefRef;
      const helmChart = labels['helm.sh/chart'];

      if (componentDefRef) {
        dbType = componentDefRef;
        // Handle special case for MySQL
        if (componentDefRef === ('mysql' as any)) {
          dbType = 'apecloud-mysql';
        }
      } else if (helmChart) {
        // Infer from helm chart name
        if (helmChart.includes('mongodb')) {
          dbType = 'mongodb';
        } else if (helmChart.includes('redis')) {
          dbType = 'redis';
        } else if (helmChart.includes('mysql')) {
          dbType = 'apecloud-mysql';
        } else if (helmChart.includes('postgresql')) {
          dbType = 'postgresql';
        } else if (helmChart.includes('kafka')) {
          dbType = 'kafka';
        } else if (helmChart.includes('clickhouse')) {
          dbType = 'clickhouse';
        }
      }
    }

    // If still no dbType, try clusterversion label
    dbVersion = labels['clusterversion.kubeblocks.io/name'] || '';

    // If no clusterversion, try app.kubernetes.io/version or serviceVersion
    if (!dbVersion) {
      dbVersion =
        labels['app.kubernetes.io/version'] ||
        (db.spec?.componentSpecs?.[0] as any)?.serviceVersion ||
        '';
    }

    // Final fallback for dbType if still not determined
    if (!dbType) {
      dbType = 'postgresql'; // Default fallback
    }
  }

  const newLabels = { ...labels };
  if (!newLabels['clusterversion.kubeblocks.io/name']) {
    newLabels['clusterversion.kubeblocks.io/name'] = dbVersion;
  }

  return {
    id: db.metadata?.uid || ``,
    createTime: dayjs(db.metadata?.creationTimestamp)
      .tz('Asia/Shanghai')
      .format('YYYY/MM/DD HH:mm'),
    status:
      db?.status?.phase && dbStatusMap[db?.status?.phase]
        ? dbStatusMap[db?.status?.phase]
        : dbStatusMap.UnKnow,
    dbType: dbType as DBType, // todo
    dbVersion: dbVersion,
    dbName: db.metadata?.name || 'db name',
    replicas: db.spec?.componentSpecs?.[0]?.replicas || 1,
    ...calcTotalResource(db.spec.componentSpecs),
    conditions: db?.status?.conditions || [],
    isDiskSpaceOverflow: false,
    labels: newLabels,
    source: getDBSource(db),
    autoBackup: adaptBackupByCluster(db),
    terminationPolicy: db.spec?.terminationPolicy || 'Delete',
    cluster: db
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
    terminationPolicy: 1,
    parameterConfig: 1
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
  type: 'Reconfiguring' | 'Switchover'
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

  let result: OpsRequestItemType = {
    id: item.metadata.uid,
    name: item.metadata.name,
    namespace: item.metadata.namespace,
    status:
      item.status?.phase && DBReconfigStatusMap[item.status.phase]
        ? DBReconfigStatusMap[item.status.phase]
        : DBReconfigStatusMap.Creating,
    startTime: item.metadata?.creationTimestamp
  };

  if (type === 'Reconfiguring') {
    result.configurations = item.spec.reconfigure!.configurations[0].keys[0].parameters.map(
      (param) => ({
        parameterName: param.key,
        newValue: param.value,
        oldValue: previousConfigurations[param.key]
      })
    );
  }

  if (type === 'Switchover') {
    result.switchover = item.spec.switchover![0];
  }

  return result;
};
