import { GET, POST, DELETE } from '@/services/request';
import type { Props as CreateBackupPros } from '@/pages/api/backup/create';

export const createBackup = (data: CreateBackupPros) => POST('/api/backup/create', data);
export const getBackupList = (dbName: string) => GET('/api/backup/getBackupList', { dbName });
