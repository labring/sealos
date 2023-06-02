import { BackupStatusMapType } from '@/types/db';

export enum BackupStatusEnum {
  Completed = 'Completed',
  InProgress = 'InProgress'
}

export const backupStatusMap: Record<`${BackupStatusEnum}`, BackupStatusMapType> = {
  [BackupStatusEnum.Completed]: {
    label: '备份成功',
    value: BackupStatusEnum.Completed,
    color: '#13B2A9'
  },
  [BackupStatusEnum.InProgress]: {
    label: '备份中',
    value: BackupStatusEnum.InProgress,
    color: '#CE9629'
  }
};

export enum BackupTypeEnum {
  manual = 'manual',
  auto = 'auto'
}

export const backupTypeMap: Record<`${BackupTypeEnum}`, { label: string }> = {
  [BackupTypeEnum.manual]: {
    label: '手动'
  },
  [BackupTypeEnum.auto]: {
    label: '自动'
  }
};
