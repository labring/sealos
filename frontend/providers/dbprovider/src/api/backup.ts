import { GET, POST, DELETE } from '@/services/request';
import type { Props as CreateBackupPros } from '@/pages/api/backup/create';
import { adaptBackup, adaptBackupByCluster, adaptDBDetail } from '@/utils/adapt';
import { AutoBackupFormType } from '@/types/backup';
import type { Props as UpdatePolicyProps } from '@/pages/api/backup/updatePolicy';

/**
 * Deprecated API: This endpoint is no longer supported.
 *
 * The new method for obtaining backup policies is by querying the 'cluster spec backup' endpoint
 * for the specific database in the cluster.
 *
 * To update the auto-backup policy, use the PATCH operation on the 'cluster spec backup' resource.
 *
 * @param data - Object containing information about the database, including dbName and dbType.
 * @returns {Promise<AutoBackupFormType>} - A promise resolving to the auto-backup configuration form.
 */
export const getBackupPolicy = (data: { dbName: string; dbType: string }) =>
  GET<AutoBackupFormType>(`/api/backup/policy`, data);

export const createBackup = (data: CreateBackupPros) => POST('/api/backup/create', data);

export const getBackupList = (dbName: string) =>
  GET('/api/backup/getBackupList', { dbName }).then((res) => res.map(adaptBackup));

export const deleteBackup = (backupName: string) =>
  DELETE(`/api/backup/delBackup?backupName=${backupName}`);

export const updateBackupPolicy = (data: UpdatePolicyProps) =>
  POST<AutoBackupFormType>(`/api/backup/updatePolicy`, data);

/**
 * Retrieves backup policy by cluster.
 * @param data An object containing dbName and dbType properties.
 * @returns A Promise that resolves to the adapted backup policy data upon successful execution.
 */
export const getBackupPolicyByCluster = (data: { dbName: string; dbType: string }) =>
  GET(`/api/getDBByName?name=${data.dbName}`).then(adaptBackupByCluster);
