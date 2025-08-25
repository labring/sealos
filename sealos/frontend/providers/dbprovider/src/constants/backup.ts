import { BackupStatusMapType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';

export enum BackupStatusEnum {
  Completed = 'Completed',
  InProgress = 'InProgress',
  Failed = 'Failed',
  UnKnow = 'UnKnow',
  Running = 'Running',
  Deleting = 'Deleting'
}

export const backupStatusMap: Record<`${BackupStatusEnum}`, BackupStatusMapType> = {
  [BackupStatusEnum.Completed]: {
    label: 'backup_completed',
    value: BackupStatusEnum.Completed,
    color: '#039855'
  },
  [BackupStatusEnum.InProgress]: {
    label: 'backup_processing',
    value: BackupStatusEnum.InProgress,
    color: '#667085'
  },
  [BackupStatusEnum.Failed]: {
    label: 'backup_failed',
    value: BackupStatusEnum.Failed,
    color: '#F04438'
  },
  [BackupStatusEnum.Running]: {
    label: 'backup_running',
    value: BackupStatusEnum.Running,
    color: '#667085'
  },
  [BackupStatusEnum.Deleting]: {
    label: 'backup_deleting',
    value: BackupStatusEnum.Deleting,
    color: '#DC6803'
  },
  [BackupStatusEnum.UnKnow]: {
    label: 'UnKnow',
    value: BackupStatusEnum.UnKnow,
    color: '#787A90'
  }
};

export const BACKUP_TYPE_LABEL_KEY = 'backup-type';
export const BACKUP_REMARK_LABEL_KEY = 'backup-remark';
export const BACKUP_LABEL_KEY = 'kubeblocks.io/restore-from-backup';
export const BACKUP_REPO_DEFAULT_KEY = 'dataprotection.kubeblocks.io/is-default-repo';

export enum BackupTypeEnum {
  manual = 'manual',
  auto = 'auto',
  'UnKnow' = 'UnKnow'
}

export const backupTypeMap: Record<`${BackupTypeEnum}`, { label: I18nCommonKey }> = {
  [BackupTypeEnum.manual]: {
    label: 'Manual'
  },
  [BackupTypeEnum.auto]: {
    label: 'Auto'
  },
  [BackupTypeEnum.UnKnow]: {
    label: 'Unknown'
  }
};
