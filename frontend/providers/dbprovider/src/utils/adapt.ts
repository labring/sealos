import { BACKUP_REMARK_LABEL_KEY, BackupTypeEnum, backupStatusMap } from '@/constants/backup';
import { DB_REMARK_KEY } from '@/constants/db';
import {
  DBBackupMethodNameMap,
  DBComponentNameMap,
  DBNameLabel,
  DBPreviousConfigKey,
  DBReconfigStatusMap,
  DBResourceChangeKey,
  DBSourceConfigs,
  DBTypeEnum,
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
  DBComponentsName,
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
  cpuFormatToC,
  cpuFormatToM,
  decodeFromHex,
  formatPodTime,
  formatTime,
  memoryFormatToGi,
  memoryFormatToMi,
  storageFormatToGi
} from '@/utils/tools';
import { getReconfigureHistoryConfigurations } from './reconfigureHistory';
import type { CoreV1EventList, V1Pod } from '@kubernetes/client-node';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { has } from 'lodash';

dayjs.extend(utc);
dayjs.extend(timezone);
import type { BackupItemType } from '../types/db';

export const getDatabaseResourceComponentSpec = (
  dbType: DBType,
  componentSpecs: KubeBlockClusterSpec['componentSpecs']
) => {
  const componentName =
    dbType === DBTypeEnum.polardbx ? 'dn-0' : dbType === 'apecloud-mysql' ? 'mysql' : dbType;

  return componentSpecs.find((comp) => String(comp.name) === componentName) || componentSpecs?.[0];
};

const getDisplayReplicas = (
  dbType: DBType,
  componentSpecs: KubeBlockClusterSpec['componentSpecs']
) => {
  return getDatabaseResourceComponentSpec(dbType, componentSpecs)?.replicas || 1;
};

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

function calcTotalResource(obj: KubeBlockClusterSpec['componentSpecs'], dbType: DBType) {
  let cpu = 0;
  let memory = 0;
  let totalCpu = 0;
  let totalMemory = 0;
  let storage = 0;
  let totalStorage = 0;

  obj.forEach((comp) => {
    const parseCpu = cpuFormatToM(comp?.resources?.limits?.cpu || '0');
    const parseMemory = memoryFormatToMi(comp?.resources?.limits?.memory || '0');
    const dataVolume = comp?.volumeClaimTemplates?.find((volume) => volume.name === 'data');
    const parseStorage = storageFormatToGi(dataVolume?.spec?.resources?.requests?.storage);
    cpu += parseCpu;
    memory += parseMemory;
    totalCpu += parseCpu * comp.replicas;
    totalMemory += parseMemory * comp.replicas;

    storage += parseStorage;
    totalStorage += parseStorage * comp.replicas;
  });

  // PolarDB-X storage is edited as the sum of component data volume sizes.
  // Keep list/detail displays on the same logical storage unit as the form.
  if (dbType === DBTypeEnum.polardbx) {
    totalStorage = storage;
  }

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
  const rawDbType = db?.metadata?.labels['clusterdefinition.kubeblocks.io/name'] || 'postgresql';
  // Convert mysql to apecloud-mysql for frontend display
  const dbType = (rawDbType as string) === 'mysql' ? 'apecloud-mysql' : rawDbType;
  // compute store amount
  return {
    id: db.metadata?.uid || ``,
    name: db.metadata?.name || 'db name',
    dbType: dbType,
    status:
      db?.status?.phase && dbStatusMap[db?.status?.phase]
        ? dbStatusMap[db?.status?.phase]
        : dbStatusMap.UnKnow,
    createTime: dayjs(db.metadata?.creationTimestamp)
      .tz('Asia/Shanghai')
      .format('YYYY/MM/DD HH:mm'),
    ...calcTotalResource(db.spec.componentSpecs, dbType),
    replicas: getDisplayReplicas(dbType, db.spec.componentSpecs),
    conditions: db?.status?.conditions || [],
    isDiskSpaceOverflow: false,
    labels: db.metadata.labels || {},
    source: getDBSource(db),
    remark: db.metadata?.annotations?.[DB_REMARK_KEY] || ''
  };
};

export const adaptDBDetail = (db: KbPgClusterType): DBDetailType => {
  const rawDbType = db?.metadata?.labels['clusterdefinition.kubeblocks.io/name'] || 'postgresql';
  // Convert mysql to apecloud-mysql for frontend display
  const dbType = (rawDbType as string) === 'mysql' ? 'apecloud-mysql' : rawDbType;

  return {
    id: db.metadata?.uid || ``,
    createTime: dayjs(db.metadata?.creationTimestamp)
      .tz('Asia/Shanghai')
      .format('YYYY/MM/DD HH:mm'),
    status:
      db?.status?.phase && dbStatusMap[db?.status?.phase]
        ? dbStatusMap[db?.status?.phase]
        : dbStatusMap.UnKnow,
    dbType: dbType,
    dbVersion: db?.metadata?.labels['clusterversion.kubeblocks.io/name'] || '',
    dbName: db.metadata?.name || 'db name',
    replicas: getDisplayReplicas(dbType, db.spec.componentSpecs),
    ...calcTotalResource(db.spec.componentSpecs, dbType),
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
  const backupMethod = DBBackupMethodNameMap[data.dbType];
  if (!backupMethod) {
    throw new Error(`Backup is not supported for database type: ${data.dbType}`);
  }

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
    method: backupMethod,
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

type OpsRequestConfiguration = NonNullable<OpsRequestItemType['configurations']>[number];

const simpleOperationTypes = ['Start', 'Stop', 'Restart'];

const normalizeOperationLogComponentName = (dbType: DBType, rawComponentName: string) => {
  if (dbType !== 'polardbx') {
    return rawComponentName;
  }

  const normalizedComponentName = rawComponentName.replace(/-\d+$/, '');

  return DBComponentNameMap[dbType].includes(normalizedComponentName as DBComponentsName)
    ? normalizedComponentName
    : rawComponentName;
};

const sortOperationLogComponents = <T extends { componentName: string }>(
  dbType: DBType,
  components: T[] = []
) => {
  const componentOrder = DBComponentNameMap[dbType] || [];

  return [...components].sort((componentA, componentB) => {
    const logicalNameA = normalizeOperationLogComponentName(dbType, componentA.componentName);
    const logicalNameB = normalizeOperationLogComponentName(dbType, componentB.componentName);
    const orderA = componentOrder.indexOf(logicalNameA as (typeof componentOrder)[number]);
    const orderB = componentOrder.indexOf(logicalNameB as (typeof componentOrder)[number]);
    const normalizedOrderA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
    const normalizedOrderB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;

    if (normalizedOrderA !== normalizedOrderB) {
      return normalizedOrderA - normalizedOrderB;
    }

    if (logicalNameA !== logicalNameB) {
      return logicalNameA.localeCompare(logicalNameB);
    }

    return componentA.componentName.localeCompare(componentB.componentName);
  });
};

const getOperationLogConfigurations = (
  item: KubeBlockOpsRequestType,
  dbType: DBType
): OpsRequestConfiguration[] => {
  if (item.spec.type === 'Reconfiguring' && item.spec.reconfigure) {
    return getReconfigureHistoryConfigurations(item, DBPreviousConfigKey, '-');
  }

  if (simpleOperationTypes.includes(item.spec.type)) {
    return [{ parameterName: item.spec.type, newValue: '-', oldValue: '-' }];
  }

  if (item.spec.type === 'VerticalScaling') {
    const resourceChange = (() => {
      if (dbType !== DBTypeEnum.polardbx) return undefined;

      try {
        const rawResourceChange = item.metadata.annotations?.[DBResourceChangeKey];
        return rawResourceChange
          ? (JSON.parse(rawResourceChange) as {
              cpu?: { old: number; new: number };
              memory?: { old: number; new: number };
            })
          : undefined;
      } catch {
        return undefined;
      }
    })();

    if (resourceChange) {
      const changedConfigs: OpsRequestConfiguration[] = [];
      if (resourceChange.cpu && resourceChange.cpu.old !== resourceChange.cpu.new) {
        changedConfigs.push({
          parameterName: `${item.spec.type}CPU`,
          oldValue: cpuFormatToC(`${resourceChange.cpu.old}m`),
          newValue: cpuFormatToC(`${resourceChange.cpu.new}m`)
        });
      }
      if (resourceChange.memory && resourceChange.memory.old !== resourceChange.memory.new) {
        changedConfigs.push({
          parameterName: `${item.spec.type}Memory`,
          oldValue: memoryFormatToGi(`${resourceChange.memory.old}Mi`),
          newValue: memoryFormatToGi(`${resourceChange.memory.new}Mi`)
        });
      }
      return changedConfigs;
    }

    return sortOperationLogComponents(dbType, item.spec.verticalScaling).flatMap((newConfig) => {
      const oldConfig = item.status?.lastConfiguration?.components?.[newConfig.componentName];
      const changedConfigs: OpsRequestConfiguration[] = [];
      const oldCpu = oldConfig?.limits?.cpu;
      const newCpu = newConfig.limits?.cpu;
      const oldMemory = oldConfig?.limits?.memory;
      const newMemory = newConfig.limits?.memory;

      if (cpuFormatToM(oldCpu || '0') !== cpuFormatToM(newCpu || '0')) {
        changedConfigs.push({
          componentName: normalizeOperationLogComponentName(dbType, newConfig.componentName),
          parameterName: `${item.spec.type}CPU`,
          newValue: newCpu ? cpuFormatToC(newCpu) : '-',
          oldValue: oldCpu ? cpuFormatToC(oldCpu) : '-'
        });
      }

      if (memoryFormatToMi(oldMemory || '0') !== memoryFormatToMi(newMemory || '0')) {
        changedConfigs.push({
          componentName: normalizeOperationLogComponentName(dbType, newConfig.componentName),
          parameterName: `${item.spec.type}Memory`,
          newValue: newMemory ? memoryFormatToGi(newMemory) : '-',
          oldValue: oldMemory ? memoryFormatToGi(oldMemory) : '-'
        });
      }

      return changedConfigs;
    });
  }

  if (item.spec.type === 'HorizontalScaling') {
    return sortOperationLogComponents(dbType, item.spec.horizontalScaling).flatMap((newConfig) => {
      const oldReplicas =
        item.status?.lastConfiguration?.components?.[newConfig.componentName]?.replicas;

      if (oldReplicas === newConfig.replicas) {
        return [];
      }

      return [
        {
          componentName: normalizeOperationLogComponentName(dbType, newConfig.componentName),
          parameterName: 'HorizontalScaling',
          newValue: String(newConfig.replicas ?? '-'),
          oldValue: String(oldReplicas ?? '-')
        }
      ];
    });
  }

  if (item.spec.type === 'VolumeExpansion') {
    return sortOperationLogComponents(dbType, item.spec.volumeExpansion).flatMap((newConfig) => {
      const oldStorage = item.status?.lastConfiguration?.components?.[
        newConfig.componentName
      ]?.volumeClaimTemplates?.find((volume) => !volume.name || volume.name === 'data')?.storage;
      const newStorage = newConfig.volumeClaimTemplates?.find(
        (volume) => !volume.name || volume.name === 'data'
      )?.storage;

      if (storageFormatToGi(oldStorage) === storageFormatToGi(newStorage)) {
        return [];
      }

      return [
        {
          componentName: normalizeOperationLogComponentName(dbType, newConfig.componentName),
          parameterName: 'VolumeExpansion',
          newValue: String(newStorage ?? '-'),
          oldValue: String(oldStorage ?? '-')
        }
      ];
    });
  }

  return [
    {
      parameterName: item.spec.type,
      newValue: '-',
      oldValue: '-'
    }
  ];
};

export const adaptOperationLog = (
  item: KubeBlockOpsRequestType,
  dbType: DBType
): OpsRequestItemType => {
  return {
    id: item.metadata.uid,
    name: item.metadata.name,
    status:
      item.status?.phase && DBReconfigStatusMap[item.status.phase]
        ? DBReconfigStatusMap[item.status.phase]
        : DBReconfigStatusMap.Creating,
    startTime: new Date(item.metadata.creationTimestamp),
    namespace: item.metadata.namespace,
    configurations: getOperationLogConfigurations(item, dbType)
  };
};

export const adaptOpsRequest = (
  item: KubeBlockOpsRequestType,
  type: 'Reconfiguring' | 'Switchover'
): OpsRequestItemType => {
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
    result.configurations = getReconfigureHistoryConfigurations(item, DBPreviousConfigKey);
  }

  if (type === 'Switchover') {
    result.switchover = item.spec.switchover![0];
  }

  return result;
};
