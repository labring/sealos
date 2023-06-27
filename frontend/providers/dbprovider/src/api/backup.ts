import { GET, POST, DELETE } from '@/services/request';
import type { Props as CreateBackupPros } from '@/pages/api/backup/create';
import { adaptBackup } from '@/utils/adapt';
import { BackupItemType } from '@/types/db';

export const createBackup = (data: CreateBackupPros) => POST('/api/backup/create', data);
export const getBackupList = (dbName: string) =>
  GET('/api/backup/getBackupList', { dbName }).then((res) => res.map(adaptBackup));

export const deleteBackup = (backupName: string) =>
  DELETE(`/api/backup/delBackup?backupName=${backupName}`);
