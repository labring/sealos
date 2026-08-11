export const BACKUP_REMARK_MAX_UTF8_BYTES = 30;

export const getBackupRemarkByteLength = (remark = '') => new TextEncoder().encode(remark).length;

export const isValidBackupRemark = (remark = '') =>
  getBackupRemarkByteLength(remark) <= BACKUP_REMARK_MAX_UTF8_BYTES;
